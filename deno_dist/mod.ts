import { Erreur } from 'https://raw.githubusercontent.com/etienne-dldc/erreur/v2.1.0/deno_dist/mod.ts';

export type Unsubscribe = () => void;
export type OnUnsubscribed = () => void;
export type SubscriptionCallback<T> = (value: T) => void;
export type VoidSubscriptionCallback = () => void;
export type UnsubscribeAllMethod = () => void;

export type SubscribeMethod<T> = (callback: SubscriptionCallback<T>, onUnsubscribe?: OnUnsubscribed) => Unsubscribe;
export type SubscribeByIdMethod<T> = (subId: string, callback: SubscriptionCallback<T>, onUnsubscribe?: OnUnsubscribed) => Unsubscribe;

export type VoidSubscribeMethod = (callback: VoidSubscriptionCallback, onUnsubscribe?: OnUnsubscribed) => Unsubscribe;
export type VoidSubscribeByIdMethod = (subId: string, callback: VoidSubscriptionCallback, onUnsubscribe?: OnUnsubscribed) => Unsubscribe;

export type VoidWatchMethod = (callback: VoidSubscriptionCallback, onUnsubscribe?: OnUnsubscribed) => Unsubscribe;
export type VoidWatchByIdMethod = (subId: string, callback: VoidSubscriptionCallback, onUnsubscribe?: OnUnsubscribed) => Unsubscribe;

export type IsSubscribedMethod<T> = (callback: SubscriptionCallback<T>) => boolean;
export type IsSubscribedByIdMethod = (subId: string) => boolean;

export type UnsubscribeMethod<T> = (callback: SubscriptionCallback<T>) => void;
export type UnsubscribeByIdMethod = (subId: string) => void;

export type VoidIsSubscribedMethod = (callback: VoidSubscriptionCallback) => boolean;
export type VoidIsSubscribedByIdMethod = (subId: string) => boolean;

export type VoidUnsubscribeMethod = (callback: VoidSubscriptionCallback) => void;
export type VoidUnsubscribeByIdMethod = (subId: string) => void;

export interface ISubscription<T> {
  subscribe: SubscribeMethod<T>;
  subscribeById: SubscribeByIdMethod<T>;
  unsubscribe: UnsubscribeMethod<T>;
  unsubscribeById: UnsubscribeByIdMethod;
  isSubscribed: IsSubscribedMethod<T>;
  isSubscribedById: IsSubscribedByIdMethod;
  unsubscribeAll: UnsubscribeAllMethod;
  size: () => number;
  emit: (newValue: T) => void;
  // unsubscribe all and forbid new subscriptions
  destroy: () => void;
  isDestroyed: () => boolean;
}
/**
 * @deprecated use ISubscription instead
 */
export type Subscription<T> = ISubscription<T>;

export interface IVoidSubscription {
  subscribe: VoidSubscribeMethod;
  subscribeById: VoidSubscribeByIdMethod;
  unsubscribe: VoidUnsubscribeMethod;
  unsubscribeById: VoidUnsubscribeByIdMethod;
  isSubscribed: VoidIsSubscribedMethod;
  isSubscribedById: VoidIsSubscribedByIdMethod;
  unsubscribeAll: UnsubscribeAllMethod;
  size: () => number;
  emit: () => void;
  // unsubscribe all and forbid new subscriptions
  destroy: () => void;
  isDestroyed: () => boolean;
}
/**
 * @deprecated use IVoidSubscription instead
 */
export type VoidSubscription = IVoidSubscription;

export interface ISubscriptionOptions {
  onFirstSubscription?: () => void;
  onLastUnsubscribe?: () => void;
  onDestroy?: () => void;
  maxSubscriptionCount?: number;
  maxRecursiveEmit?: number;
}
/**
 * @deprecated use ISubscriptionOptions instead
 */
export type SubscriptionOptions = ISubscriptionOptions;

// @internal
interface SubscriptionItem<T> {
  callback: SubscriptionCallback<T>;
  subId: string | null;
  unsubscribe: Unsubscribe;
  onUnsubscribe: OnUnsubscribed | undefined;
}

export const Subscription = (() => {
  return { create, createVoid };

  function createVoid(options: ISubscriptionOptions = {}): IVoidSubscription {
    return create<void>(options);
  }

  function create<T>(options: ISubscriptionOptions = {}): ISubscription<T> {
    const { onFirstSubscription, onLastUnsubscribe, onDestroy, maxRecursiveEmit = 1000, maxSubscriptionCount = 10000 } = options;

    const subscriptions: Array<SubscriptionItem<T>> = [];
    let nextSubscriptions: Array<SubscriptionItem<T>> = [];
    const emitQueue: Array<{ value: T }> = [];
    let isEmitting = false;
    let destroyed = false;

    const sub: ISubscription<T> = {
      subscribe,
      subscribeById,
      unsubscribe,
      unsubscribeById,
      isSubscribed,
      isSubscribedById,
      unsubscribeAll,
      emit,
      size,
      destroy,
      isDestroyed,
    };

    return sub as any;

    function isDestroyed() {
      return destroyed;
    }

    function destroy() {
      if (destroyed) {
        return;
      }
      destroyed = true;
      unsubscribeAll();
      if (onDestroy) {
        onDestroy();
      }
    }

    function emit(newValue: T): void {
      if (destroyed) {
        throw SuubErreur.SubscriptionDestroyed.create();
      }
      emitQueue.push({ value: newValue });
      if (isEmitting) {
        return;
      }
      isEmitting = true;
      let emitQueueSafe = maxRecursiveEmit + 1; // add one because we don't count the first one
      while (emitQueueSafe > 0 && emitQueue.length > 0) {
        emitQueueSafe--;
        const value = emitQueue.shift()!.value;
        nextSubscriptions = [...subscriptions];
        let safe = maxSubscriptionCount;
        while (safe > 0 && nextSubscriptions.length > 0) {
          safe--;
          // cannot be undefined because length > 0
          const item = nextSubscriptions.shift()!;
          item.callback(value);
        }
        if (safe <= 0) {
          isEmitting = false;
          throw SuubErreur.MaxSubscriptionCountReached.create();
        }
      }
      isEmitting = false;
      if (emitQueueSafe <= 0) {
        throw SuubErreur.maxRecursiveEmitReached.create(maxRecursiveEmit);
      }
    }

    function subscribe(callback: SubscriptionCallback<T>, onUnsubscribe?: OnUnsubscribed): Unsubscribe {
      return subscribeInternal(callback, null, onUnsubscribe);
    }

    function subscribeById(subId: string, callback: SubscriptionCallback<T>, onUnsubscribe?: OnUnsubscribed): Unsubscribe {
      return subscribeInternal(callback, subId, onUnsubscribe);
    }

    function subscribeInternal(
      callback: SubscriptionCallback<T>,
      subId: string | null,
      onUnsubscribe: OnUnsubscribed | undefined
    ): Unsubscribe {
      if (destroyed) {
        throw SuubErreur.SubscriptionDestroyed.create();
      }

      if (typeof callback !== 'function') {
        throw SuubErreur.InvalidCallback.create();
      }

      const alreadySubscribed = findSubscription(subId, callback);

      if (alreadySubscribed) {
        if (subId !== null) {
          // We have a subId
          // We need to update callback and onUnsubscribe
          alreadySubscribed.callback = callback;
        }
        alreadySubscribed.onUnsubscribe = onUnsubscribe;
        // Now we move move the subscription to the end
        const subIndex = subscriptions.indexOf(alreadySubscribed);
        subscriptions.splice(subIndex, 1);
        subscriptions.push(alreadySubscribed);
        // return the unsub
        return alreadySubscribed.unsubscribe;
      }

      // New subscription
      let isSubscribed = true;
      subscriptions.push({
        subId,
        callback: callback,
        unsubscribe: unsubscribeCurrent,
        onUnsubscribe,
      });
      if (subscriptions.length === 1 && onFirstSubscription) {
        onFirstSubscription();
      }

      function unsubscribeCurrent(): void {
        if (!isSubscribed) {
          return;
        }
        isSubscribed = false;
        const index = subscriptions.findIndex((i) => i.callback === callback);

        // isSubscribed is true but the callback is not in the list
        // this should not happend but if it does we ignore the unsub
        /* istanbul ignore next */
        if (index === -1) {
          console.warn(`Subscribe (isSubscribed === true) callback is not in the subscriptions list. Please report a bug.`);
          return;
        }
        const item = subscriptions[index];
        subscriptions.splice(index, 1);
        const queueIndex = nextSubscriptions.findIndex((i) => i.callback === callback);
        if (queueIndex >= 0) {
          nextSubscriptions.splice(queueIndex, 1);
        }
        if (item.onUnsubscribe) {
          item.onUnsubscribe();
        }
        if (subscriptions.length === 0 && onLastUnsubscribe) {
          onLastUnsubscribe();
        }
      }

      return unsubscribeCurrent;
    }

    function findSubscription(subId: string | null, callback?: SubscriptionCallback<any>): SubscriptionItem<T> | undefined {
      return subId === null ? subscriptions.find((l) => l.callback === callback) : subscriptions.find((l) => l.subId === subId);
    }

    function unsubscribeAll(): void {
      while (subscriptions.length > 0) {
        subscriptions[0].unsubscribe();
      }
      // Note: we don't need to clear the emit queue because the unsubscribe() will take care of it
      return;
    }

    function unsubscribe(callback: SubscriptionCallback<T>): void {
      unsubscribeInternal(null, callback);
    }

    function unsubscribeById(subId: string): void {
      unsubscribeInternal(subId);
    }

    function unsubscribeInternal(subId: string | null, callback?: SubscriptionCallback<T>): void {
      const subscription = findSubscription(subId, callback);
      if (subscription) {
        subscription.unsubscribe();
      }
    }

    function isSubscribed(callback: SubscriptionCallback<T>): boolean {
      return isSubscribedInternal(null, callback);
    }

    function isSubscribedById(subId: string): boolean {
      return isSubscribedInternal(subId);
    }

    function isSubscribedInternal(subId: string | null, callback?: SubscriptionCallback<T>): boolean {
      const subscription = findSubscription(subId, callback);
      return subscription !== undefined;
    }

    function size(): number {
      return subscriptions.length;
    }
  }
})();

export const SuubErreur = {
  SubscriptionDestroyed: Erreur.declare<null>('SubscriptionDestroyed', () => `The subscription has been destroyed`).withTransform(
    () => null
  ),
  MaxSubscriptionCountReached: Erreur.declare<null>(
    'MaxSubscriptionCountReached',
    () => `The maxSubscriptionCount has been reached. If this is expected you can use the maxSubscriptionCount option to raise the limit`
  ).withTransform(() => null),
  maxRecursiveEmitReached: Erreur.declare<{ limit: number }>(
    'maxRecursiveEmitReached',
    ({ limit }) =>
      `The maxRecursiveEmit limit (${limit}) has been reached, did you emit() in a callback ? If this is expected you can use the maxRecursiveEmit option to raise the limit`
  ).withTransform((limit: number) => ({ limit })),
  InvalidCallback: Erreur.declare<null>('InvalidCallback', () => `The callback is not a function`).withTransform(() => null),
};
