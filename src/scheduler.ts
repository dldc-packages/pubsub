import {
  throwInvalidCallback,
  throwMaxRecursiveEmitReached,
  throwMaxSubscriptionCountReached,
  throwMaxUnsubscribeAllLoopReached,
  throwSubscriptionDestroyed,
} from "./erreur.ts";
import { IS_SCHEDULER } from "./internal.ts";
import type { TSubscription, TSubscriptionOptions } from "./subscription.ts";
import type {
  BatchMethod,
  TOnUnsubscribed,
  TSubscriptionCallback,
  TUnsubscribe,
} from "./types.ts";

export interface TSchedulerOptions {
  readonly onFirstSubscription?: () => void;
  readonly onLastUnsubscribe?: () => void;
  readonly onDestroy?: () => void;
  readonly maxSubscriptionCount?: number;
  readonly maxRecursiveEmit?: number;
  readonly maxUnsubscribeAllLoop?: number;
}

export type TSchedulerSubscribe = <Data>(
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

export interface TScheduler {
  readonly [IS_SCHEDULER]: true;
  readonly size: (subscription: TSubscription<any> | null) => number;
  readonly isDestroyed: () => boolean;
  readonly destroy: () => void;
  readonly emit: <Data>(
    subscription: TSubscription<Data>,
    newValue: Data,
  ) => void;
  readonly batch: BatchMethod;
  readonly unsubscribeAll: (subscription: TSubscription<any> | null) => void;
  readonly subscribe: TSchedulerSubscribe;
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
    return subscriptions.filter((sub) => sub.subscription === subscription)
      .length;
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
      return throwSubscriptionDestroyed();
    }
    emitQueue.push({ value: newValue, subscription });
    if (isEmitting) {
      return;
    }
    isEmitting = true;
    applyEmitQueue();
  }

  function batch<Result>(callback: () => Result): Result {
    if (isEmitting) {
      return callback();
    }
    isEmitting = true;
    const result = callback();
    applyEmitQueue();
    return result;
  }

  function applyEmitQueue() {
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
        return throwMaxSubscriptionCountReached();
      }
    }
    isEmitting = false;
    if (emitQueueSafe <= 0) {
      return throwMaxRecursiveEmitReached(maxRecursiveEmit);
    }
  }

  function unsubscribeAll(subscription: TSubscription<any> | null): void {
    let safe = maxUnsubscribeAllLoop + subscriptions.length;
    while (safe > 0) {
      if (subscriptions.length === 0) {
        break;
      }
      const nextItem = subscriptions.find(
        (item) => subscription === null || item.subscription === subscription,
      );
      if (!nextItem) {
        break;
      }
      safe--;
      nextItem.unsubscribe();
    }
    if (safe <= 0) {
      return throwMaxUnsubscribeAllLoopReached(maxUnsubscribeAllLoop);
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
      return throwSubscriptionDestroyed();
    }

    if (typeof callback !== "function") {
      return throwInvalidCallback();
    }

    const alreadySubscribed = findSubscriptionItem(
      subscription,
      subId,
      callback,
    );

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
      const subSizeAfter = subscriptions.filter(
        (i) => i.subscription === subscription,
      ).length;
      if (subSizeAfter === 1) {
        subscriptionOptions.onFirstSubscription();
      }
    }

    function unsubscribeCurrent(): void {
      if (!isSubscribed) {
        return;
      }
      isSubscribed = false;
      const index = subscriptions.findIndex(
        (i) => i.subscription === subscription && i.callback === callback,
      );

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
      const queueIndex = nextSubscriptions.findIndex(
        (i) => i.callback === callback,
      );
      if (queueIndex >= 0) {
        nextSubscriptions.splice(queueIndex, 1);
      }
      if (item.onUnsubscribe) {
        item.onUnsubscribe();
      }
      if (subscriptionOptions.onLastUnsubscribe && subSizeBefore > 0) {
        const subSizeAfter = subscriptions.filter(
          (i) => i.subscription === subscription,
        ).length;
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
    const subscriptionItem = findSubscriptionItem(
      subscription,
      subId,
      callback,
    );
    return subscriptionItem !== undefined;
  }

  function unsubscribe<Data>(
    subscription: TSubscription<Data>,
    subId: string | null,
    callback?: TSubscriptionCallback<Data>,
  ): void {
    const subscriptionItem = findSubscriptionItem(
      subscription,
      subId,
      callback,
    );
    if (subscriptionItem) {
      subscriptionItem.unsubscribe();
    }
  }
}
