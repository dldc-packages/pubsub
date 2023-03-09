import { Erreur } from 'https://raw.githubusercontent.com/etienne-dldc/erreur/v2.0.0/deno_dist/mod.ts';

export type Unsubscribe = () => void;
export type OnUnsubscribed = () => void;
export type SubscriptionCallback<T> = (value: T) => void;
export type VoidSubscriptionCallback = () => void;
export type UnsubscribeAllMethod = () => void;

export interface SubscribeMethod<T> {
  (callback: SubscriptionCallback<T>, onUnsubscribe?: OnUnsubscribed): Unsubscribe;
  (subId: string, callback: SubscriptionCallback<T>, onUnsubscribe?: OnUnsubscribed): Unsubscribe;
}

export interface VoidSubscribeMethod {
  (callback: VoidSubscriptionCallback, onUnsubscribe?: OnUnsubscribed): Unsubscribe;
  (subId: string, callback: VoidSubscriptionCallback, onUnsubscribe?: OnUnsubscribed): Unsubscribe;
}

export interface IsSubscribedMethod<T> {
  (subId: string): boolean;
  (callback: SubscriptionCallback<T>): boolean;
}

export interface UnsubscribeMethod<T> {
  (subId: string): void;
  (callback: SubscriptionCallback<T>): void;
}

export interface VoidIsSubscribedMethod {
  (subId: string): boolean;
  (callback: VoidSubscriptionCallback): boolean;
}

export interface VoidUnsubscribeMethod {
  (subId: string): void;
  (callback: VoidSubscriptionCallback): void;
}

export interface ISubscription<T> {
  subscribe: SubscribeMethod<T>;
  unsubscribe: UnsubscribeMethod<T>;
  unsubscribeAll: UnsubscribeAllMethod;
  isSubscribed: IsSubscribedMethod<T>;
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
  unsubscribe: VoidUnsubscribeMethod;
  unsubscribeAll: UnsubscribeAllMethod;
  isSubscribed: VoidIsSubscribedMethod;
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
  maxRecursiveCall?: number;
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
  return Object.assign(legacyCreate, { create, createVoid });

  /**
   * @deprecated use Subscription.create() or Subscription.createVoid() instead
   */
  function legacyCreate<T = void>(
    options: ISubscriptionOptions = {}
  ): [T] extends [void] ? IVoidSubscription : ISubscription<T> {
    return create<T>(options) as any;
  }

  function createVoid(options: ISubscriptionOptions = {}): IVoidSubscription {
    return create<void>(options);
  }

  function create<T>(options: ISubscriptionOptions = {}): ISubscription<T> {
    const {
      onFirstSubscription,
      onLastUnsubscribe,
      onDestroy,
      maxRecursiveCall = 1000,
      maxSubscriptionCount = 10000,
    } = options;

    const subscriptions: Array<SubscriptionItem<T>> = [];
    let nextSubscriptions: Array<SubscriptionItem<T>> = [];
    const emitQueue: Array<{ value: T }> = [];
    let isEmitting = false;
    let destroyed = false;

    const sub: ISubscription<T> = {
      subscribe,
      unsubscribe,
      unsubscribeAll,
      isSubscribed,
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
      let emitQueueSafe = maxRecursiveCall + 1; // add one because we don't count the first one
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
      if (emitQueueSafe <= 0) {
        isEmitting = false;
        throw SuubErreur.MaxRecursiveCallReached.create();
      }
      isEmitting = false;
    }

    function subscribe(
      arg1: string | SubscriptionCallback<T>,
      arg2?: OnUnsubscribed | SubscriptionCallback<T>,
      arg3?: OnUnsubscribed
    ): Unsubscribe {
      if (destroyed) {
        throw SuubErreur.SubscriptionDestroyed.create();
      }
      const subId = typeof arg1 === 'string' ? arg1 : null;
      const callback: SubscriptionCallback<T> = typeof arg1 === 'string' ? (arg2 as any) : arg1;
      const onUnsubscribe: OnUnsubscribed | undefined =
        typeof arg1 === 'string' ? arg3 : (arg2 as any);

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
          console.warn(
            `Subscribe (isSubscribed === true) callback is not in the subscriptions list. Please report a bug.`
          );
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

    function findSubscription(
      subId: string | null,
      callback?: SubscriptionCallback<any>
    ): SubscriptionItem<T> | undefined {
      return subId === null
        ? subscriptions.find((l) => l.callback === callback)
        : subscriptions.find((l) => l.subId === subId);
    }

    function unsubscribeAll(): void {
      while (subscriptions.length > 0) {
        subscriptions[0].unsubscribe();
      }
      // Note: we don't need to clear the emit queue because the unsubscribe() will take care of it
      return;
    }

    function unsubscribe(subId: string): void;
    function unsubscribe(callback: SubscriptionCallback<T>): void;
    function unsubscribe(arg1: string | SubscriptionCallback<T>): void {
      const [subId, callback] = typeof arg1 === 'string' ? [arg1, undefined] : [null, arg1];
      const subscription = findSubscription(subId, callback);
      if (subscription) {
        subscription.unsubscribe();
      }
    }

    function isSubscribed(subId: string): boolean;
    function isSubscribed(callback: SubscriptionCallback<T>): boolean;
    function isSubscribed(arg1: string | SubscriptionCallback<T>): boolean {
      const [subId, callback] = typeof arg1 === 'string' ? [arg1, undefined] : [null, arg1];
      const subscription = findSubscription(subId, callback);
      return subscription !== undefined;
    }

    function size(): number {
      return subscriptions.length;
    }
  }
})();

export const SuubErreur = {
  SubscriptionDestroyed: Erreur.declare<null>(
    'SubscriptionDestroyed',
    () => `The subscription has been destroyed`
  ).withTransform(() => null),
  MaxSubscriptionCountReached: Erreur.declare<null>(
    'MaxSubscriptionCountReached',
    () =>
      `The maxSubscriptionCount has been reached. If this is expected you can use the maxSubscriptionCount option to raise the limit`
  ).withTransform(() => null),
  MaxRecursiveCallReached: Erreur.declare<null>(
    'MaxRecursiveCallReached',
    () =>
      `The maxRecursiveCall has been reached, did you emit() in a callback ? If this is expected you can use the maxRecursiveCall option to raise the limit`
  ).withTransform(() => null),
  InvalidCallback: Erreur.declare<null>(
    'InvalidCallback',
    () => `The callback is not a function`
  ).withTransform(() => null),
};
