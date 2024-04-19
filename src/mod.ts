import type { TKey, TVoidKey } from '@dldc/erreur';
import { Erreur, Key } from '@dldc/erreur';

export type TUnsubscribe = () => void;
export type TOnUnsubscribed = () => void;
export type TSubscriptionCallback<T> = (value: T) => void;
export type VoidSubscriptionCallback = () => void;
export type UnsubscribeAllMethod = () => void;

export type SubscribeMethod<T> = (callback: TSubscriptionCallback<T>, onUnsubscribe?: TOnUnsubscribed) => TUnsubscribe;
export type SubscribeByIdMethod<T> = (
  subId: string,
  callback: TSubscriptionCallback<T>,
  onUnsubscribe?: TOnUnsubscribed,
) => TUnsubscribe;
export type VoidSubscribeMethod = (callback: VoidSubscriptionCallback, onUnsubscribe?: TOnUnsubscribed) => TUnsubscribe;
export type VoidSubscribeByIdMethod = (
  subId: string,
  callback: VoidSubscriptionCallback,
  onUnsubscribe?: TOnUnsubscribed,
) => TUnsubscribe;

export type IsSubscribedMethod<T> = (callback: TSubscriptionCallback<T>) => boolean;
export type IsSubscribedByIdMethod = (subId: string) => boolean;

export type UnsubscribeMethod<T> = (callback: TSubscriptionCallback<T>) => void;
export type UnsubscribeByIdMethod = (subId: string) => void;

export type VoidIsSubscribedMethod = (callback: VoidSubscriptionCallback) => boolean;
export type VoidIsSubscribedByIdMethod = (subId: string) => boolean;

export type VoidUnsubscribeMethod = (callback: VoidSubscriptionCallback) => void;
export type VoidUnsubscribeByIdMethod = (subId: string) => void;

export type BatchMethod = <Result>(callback: () => Result) => Result;

export const IS_SUBSCRIPTION = Symbol('IS_SUBSCRIPTION');

export interface TSubscription<Data> {
  readonly [IS_SUBSCRIPTION]: true;
  readonly scheduler: TScheduler;
  readonly subscribe: SubscribeMethod<Data>;
  readonly subscribeById: SubscribeByIdMethod<Data>;
  readonly unsubscribe: UnsubscribeMethod<Data>;
  readonly unsubscribeById: UnsubscribeByIdMethod;
  readonly isSubscribed: IsSubscribedMethod<Data>;
  readonly isSubscribedById: IsSubscribedByIdMethod;
  readonly unsubscribeAll: UnsubscribeAllMethod;
  readonly batch: BatchMethod;
  readonly size: () => number;
  readonly emit: (newValue: Data) => void;
  readonly destroy: () => void;
  readonly isDestroyed: () => boolean;
}

export interface TVoidSubscription {
  readonly scheduler: TScheduler;
  readonly subscribe: VoidSubscribeMethod;
  readonly subscribeById: VoidSubscribeByIdMethod;
  readonly unsubscribe: VoidUnsubscribeMethod;
  readonly unsubscribeById: VoidUnsubscribeByIdMethod;
  readonly isSubscribed: VoidIsSubscribedMethod;
  readonly isSubscribedById: VoidIsSubscribedByIdMethod;
  readonly unsubscribeAll: UnsubscribeAllMethod;
  readonly batch: BatchMethod;
  readonly size: () => number;
  readonly emit: () => void;
  readonly destroy: () => void;
  readonly isDestroyed: () => boolean;
}

export interface TSubscriptionOptions {
  readonly onFirstSubscription?: () => void;
  readonly onLastUnsubscribe?: () => void;
}

export interface TSchedulerOptions {
  readonly onFirstSubscription?: () => void;
  readonly onLastUnsubscribe?: () => void;
  readonly onDestroy?: () => void;
  readonly maxSubscriptionCount?: number;
  readonly maxRecursiveEmit?: number;
  readonly maxUnsubscribeAllLoop?: number;
}

export type TSchedulerEmit = <Data>(
  subscription: TSubscription<Data>,
  subscriptionOptions: TSubscriptionOptions,
  callback: TSubscriptionCallback<Data>,
  subId: string | null,
  onUnsubscribe: TOnUnsubscribed | undefined,
) => TUnsubscribe;

export type TSchedulerIsSubscribed = <Data>(
  subscription: TSubscription<Data>,
  subId: string | null,
  callback?: TSubscriptionCallback<Data>,
) => boolean;

export type TSchedulerUnsubscribe = <Data>(
  subscription: TSubscription<Data>,
  subId: string | null,
  callback?: TSubscriptionCallback<Data>,
) => void;

export const IS_SCHEDULER = Symbol('IS_SCHEDULER');

export interface TScheduler {
  readonly [IS_SCHEDULER]: true;
  readonly size: (subscription: TSubscription<any> | null) => number;
  readonly isDestroyed: () => boolean;
  readonly destroy: () => void;
  readonly emit: <Data>(subscription: TSubscription<Data>, newValue: Data) => void;
  readonly batch: BatchMethod;
  readonly unsubscribeAll: (subscription: TSubscription<any> | null) => void;
  readonly subscribe: TSchedulerEmit;
  readonly isSubscribed: TSchedulerIsSubscribed;
  readonly unsubscribe: TSchedulerUnsubscribe;
}

export function createScheduler(options: TSchedulerOptions = {}): TScheduler {
  const {
    onFirstSubscription,
    onLastUnsubscribe,
    onDestroy,
    maxRecursiveEmit = 1000,
    maxSubscriptionCount = 10000,
    maxUnsubscribeAllLoop = 1000,
  } = options;

  interface TSubscriptionItem<Data> {
    subscription: TSubscription<Data>;
    callback: TSubscriptionCallback<Data>;
    subId: string | null;
    unsubscribe: TUnsubscribe;
    onUnsubscribe: TOnUnsubscribed | undefined;
  }

  interface TEmitQueueItem<Data> {
    value: Data;
    subscription: TSubscription<Data>;
  }

  const subscriptions: Array<TSubscriptionItem<any>> = [];
  let nextSubscriptions: Array<TSubscriptionItem<any>> = [];
  const emitQueue: Array<TEmitQueueItem<any>> = [];
  let isEmitting = false;
  let destroyed = false;

  return {
    [IS_SCHEDULER]: true,
    size,
    isDestroyed,
    destroy,
    emit,
    batch,
    unsubscribeAll,
    subscribe,
    isSubscribed,
    unsubscribe,
  };

  function size(subscription: TSubscription<any> | null): number {
    if (!subscription) {
      return subscriptions.length;
    }
    return subscriptions.filter((sub) => sub.subscription === subscription).length;
  }

  function isDestroyed() {
    return destroyed;
  }

  function destroy() {
    if (destroyed) {
      return;
    }
    destroyed = true;
    unsubscribeAll(null);
    if (onDestroy) {
      onDestroy();
    }
  }

  function emit<Data>(subscription: TSubscription<Data>, newValue: Data): void {
    if (destroyed) {
      throw PubSubErreur.SubscriptionDestroyed.create();
    }
    emitQueue.push({ value: newValue, subscription });
    if (isEmitting) {
      return;
    }
    isEmitting = true;
    handleEmitQueue();
  }

  function batch<Result>(callback: () => Result): Result {
    if (isEmitting) {
      return callback();
    }
    isEmitting = true;
    const result = callback();
    handleEmitQueue();
    return result;
  }

  function handleEmitQueue() {
    let emitQueueSafe = maxRecursiveEmit + 1; // add one because we don't count the first one
    while (emitQueueSafe > 0 && emitQueue.length > 0) {
      emitQueueSafe--;
      const emitItem = emitQueue.shift()!;
      nextSubscriptions = [...subscriptions];
      let safe = maxSubscriptionCount;
      while (safe > 0 && nextSubscriptions.length > 0) {
        safe--;
        // cannot be undefined because length > 0
        const subItem = nextSubscriptions.shift()!;
        if (subItem.subscription === emitItem.subscription) {
          subItem.callback(emitItem.value);
        }
      }
      if (safe <= 0) {
        isEmitting = false;
        throw PubSubErreur.MaxSubscriptionCountReached.create();
      }
    }
    isEmitting = false;
    if (emitQueueSafe <= 0) {
      throw PubSubErreur.MaxRecursiveEmitReached.create(maxRecursiveEmit);
    }
  }

  function unsubscribeAll(subscription: TSubscription<any> | null): void {
    let safe = maxUnsubscribeAllLoop + subscriptions.length;
    while (safe > 0) {
      if (subscriptions.length === 0) {
        break;
      }
      const nextItem = subscriptions.find((item) => subscription === null || item.subscription === subscription);
      if (!nextItem) {
        break;
      }
      safe--;
      nextItem.unsubscribe();
    }
    if (safe <= 0) {
      throw PubSubErreur.MaxUnsubscribeAllLoopReached.create(maxUnsubscribeAllLoop);
    }
    // Note: we don't need to clear the emit queue because the unsubscribe() will take care of it
    return;
  }

  function subscribe<Data>(
    subscription: TSubscription<Data>,
    subscriptionOptions: TSubscriptionOptions,
    callback: TSubscriptionCallback<Data>,
    subId: string | null,
    onUnsubscribe: TOnUnsubscribed | undefined,
  ): TUnsubscribe {
    if (destroyed) {
      throw PubSubErreur.SubscriptionDestroyed.create();
    }

    if (typeof callback !== 'function') {
      throw PubSubErreur.InvalidCallback.create();
    }

    const alreadySubscribed = findSubscriptionItem(subscription, subId, callback);

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
    const subSizeBefore = subscriptionOptions.onFirstSubscription
      ? subscriptions.filter((i) => i.subscription === subscription).length
      : 0;
    let isSubscribed = true;
    subscriptions.push({
      subscription,
      subId,
      callback: callback,
      unsubscribe: unsubscribeCurrent,
      onUnsubscribe,
    });
    if (subscriptions.length === 1 && onFirstSubscription) {
      onFirstSubscription();
    }
    if (subscriptionOptions.onFirstSubscription && subSizeBefore === 0) {
      const subSizeAfter = subscriptions.filter((i) => i.subscription === subscription).length;
      if (subSizeAfter === 1) {
        subscriptionOptions.onFirstSubscription();
      }
    }

    function unsubscribeCurrent(): void {
      if (!isSubscribed) {
        return;
      }
      isSubscribed = false;
      const index = subscriptions.findIndex((i) => i.subscription === subscription && i.callback === callback);

      // isSubscribed is true but the callback is not in the list
      // this should not happend but if it does we ignore the unsub
      /* istanbul ignore next */
      if (index === -1) {
        console.warn(
          `Subscribe (isSubscribed === true) callback is not in the subscriptions list. Please report a bug.`,
        );
        return;
      }
      const item = subscriptions[index];
      const subSizeBefore = subscriptionOptions.onLastUnsubscribe
        ? subscriptions.filter((i) => i.subscription === subscription).length
        : 0;
      subscriptions.splice(index, 1);
      const queueIndex = nextSubscriptions.findIndex((i) => i.callback === callback);
      if (queueIndex >= 0) {
        nextSubscriptions.splice(queueIndex, 1);
      }
      if (item.onUnsubscribe) {
        item.onUnsubscribe();
      }
      if (subscriptionOptions.onLastUnsubscribe && subSizeBefore > 0) {
        const subSizeAfter = subscriptions.filter((i) => i.subscription === subscription).length;
        if (subSizeAfter === 0) {
          subscriptionOptions.onLastUnsubscribe();
        }
      }
      if (subscriptions.length === 0 && onLastUnsubscribe) {
        onLastUnsubscribe();
      }
    }

    return unsubscribeCurrent;
  }

  function findSubscriptionItem<Data>(
    subscription: TSubscription<Data>,
    subId: string | null,
    callback?: TSubscriptionCallback<any>,
  ): TSubscriptionItem<Data> | undefined {
    return subscriptions.find((item) => {
      if (item.subscription !== subscription) {
        return false;
      }
      return subId === null ? item.callback === callback : item.subId === subId;
    }) as TSubscriptionItem<Data> | undefined;
  }

  function isSubscribed<Data>(
    subscription: TSubscription<Data>,
    subId: string | null,
    callback?: TSubscriptionCallback<Data>,
  ): boolean {
    const subscriptionItem = findSubscriptionItem(subscription, subId, callback);
    return subscriptionItem !== undefined;
  }

  function unsubscribe<Data>(
    subscription: TSubscription<Data>,
    subId: string | null,
    callback?: TSubscriptionCallback<Data>,
  ): void {
    const subscriptionItem = findSubscriptionItem(subscription, subId, callback);
    if (subscriptionItem) {
      subscriptionItem.unsubscribe();
    }
  }
}

export function createVoidSubscription(scheduler?: TSchedulerOptions): TVoidSubscription;
export function createVoidSubscription(scheduler: TScheduler, options?: TSubscriptionOptions): TVoidSubscription;
export function createVoidSubscription(
  scheduler: TSchedulerOptions | TScheduler = {},
  options: TSubscriptionOptions = {},
): TVoidSubscription {
  return createSubscriptionInternal<void>(scheduler, options);
}

export function createSubscription<Data>(scheduler?: TSchedulerOptions): TSubscription<Data>;
export function createSubscription<Data>(scheduler?: TScheduler, options?: TSubscriptionOptions): TSubscription<Data>;
export function createSubscription<Data>(
  scheduler: TSchedulerOptions | TScheduler = {},
  options: TSubscriptionOptions = {},
): TSubscription<Data> {
  return createSubscriptionInternal<Data>(scheduler, options);
}

function createSubscriptionInternal<Data>(
  scheduler: TSchedulerOptions | TScheduler = {},
  options: TSubscriptionOptions = {},
): TSubscription<Data> {
  const sch = isScheduler(scheduler) ? scheduler : createScheduler(scheduler);

  const sub: TSubscription<Data> = {
    [IS_SUBSCRIPTION]: true,
    scheduler: sch,
    subscribe,
    subscribeById,
    unsubscribe,
    unsubscribeById,
    isSubscribed,
    isSubscribedById,
    unsubscribeAll,
    emit,
    size,
    batch: sch.batch,
    destroy: sch.destroy,
    isDestroyed: sch.isDestroyed,
  };

  return sub as any;

  function emit(newValue: Data): void {
    return sch.emit(sub, newValue);
  }

  function subscribe(callback: TSubscriptionCallback<Data>, onUnsubscribe?: TOnUnsubscribed): TUnsubscribe {
    return sch.subscribe(sub, options, callback, null, onUnsubscribe);
  }

  function subscribeById(
    subId: string,
    callback: TSubscriptionCallback<Data>,
    onUnsubscribe?: TOnUnsubscribed,
  ): TUnsubscribe {
    return sch.subscribe(sub, options, callback, subId, onUnsubscribe);
  }

  function unsubscribeAll(): void {
    return sch.unsubscribeAll(sub);
  }

  function unsubscribe(callback: TSubscriptionCallback<Data>): void {
    sch.unsubscribe(sub, null, callback);
  }

  function unsubscribeById(subId: string): void {
    sch.unsubscribe(sub, subId);
  }

  function isSubscribed(callback: TSubscriptionCallback<Data>): boolean {
    return sch.isSubscribed(sub, null, callback);
  }

  function isSubscribedById(subId: string): boolean {
    return sch.isSubscribed(sub, subId);
  }

  function size(): number {
    return sch.size(sub);
  }
}

export function isScheduler(scheduler: any): scheduler is TScheduler {
  return scheduler[IS_SCHEDULER] === true;
}

export function isSubscription(subscription: any): subscription is TSubscription<any> {
  return subscription[IS_SUBSCRIPTION] === true;
}

export const PubSubErreur = (() => {
  const SubscriptionDestroyedKey: TVoidKey = Key.createEmpty('SubscriptionDestroyed');
  const MaxSubscriptionCountReachedKey: TVoidKey = Key.createEmpty('MaxSubscriptionCountReached');
  const MaxRecursiveEmitReachedKey: TKey<{ limit: number }> = Key.create('MaxRecursiveEmitReached');
  const MaxUnsubscribeAllLoopReachedKey: TKey<{ limit: number }> = Key.create('MaxUnsubscribeAllLoopReached');
  const InvalidCallbackKey: TVoidKey = Key.createEmpty('InvalidCallback');

  return {
    SubscriptionDestroyed: {
      Key: SubscriptionDestroyedKey,
      create() {
        return Erreur.create(new Error('The subscription has been destroyed')).with(
          SubscriptionDestroyedKey.Provider(),
        );
      },
    },
    MaxSubscriptionCountReached: {
      Key: MaxSubscriptionCountReachedKey,
      create() {
        return Erreur.create(
          new Error(
            `The maxSubscriptionCount has been reached. If this is expected you can use the maxSubscriptionCount option to raise the limit`,
          ),
        ).with(MaxSubscriptionCountReachedKey.Provider());
      },
    },
    MaxRecursiveEmitReached: {
      Key: MaxRecursiveEmitReachedKey,
      create(limit: number) {
        return Erreur.create(
          new Error(
            `The maxRecursiveEmit limit (${limit}) has been reached, did you emit() in a callback ? If this is expected you can use the maxRecursiveEmit option to raise the limit`,
          ),
        ).with(MaxRecursiveEmitReachedKey.Provider({ limit }));
      },
    },
    MaxUnsubscribeAllLoopReached: {
      Key: MaxUnsubscribeAllLoopReachedKey,
      create(limit: number) {
        return Erreur.create(
          new Error(
            `The maxUnsubscribeAllLoop limit (${limit}) has been reached, did you call subscribe() in the onUnsubscribe callback then called unsubscribeAll ? If this is expected you can use the maxUnsubscribeAllLoop option to raise the limit`,
          ),
        ).with(MaxUnsubscribeAllLoopReachedKey.Provider({ limit }));
      },
    },
    InvalidCallback: {
      Key: InvalidCallbackKey,
      create() {
        return Erreur.create(new Error(`The callback is not a function`)).with(InvalidCallbackKey.Provider());
      },
    },
  };
})();
