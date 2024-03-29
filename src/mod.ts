import type { TKey, TVoidKey } from '@dldc/erreur';
import { Erreur, Key } from '@dldc/erreur';

export type Unsubscribe = () => void;
export type OnUnsubscribed = () => void;
export type SubscriptionCallback<T> = (value: T) => void;
export type VoidSubscriptionCallback = () => void;
export type UnsubscribeAllMethod = () => void;

export type SubscribeMethod<T> = (callback: SubscriptionCallback<T>, onUnsubscribe?: OnUnsubscribed) => Unsubscribe;
export type SubscribeByIdMethod<T> = (
  subId: string,
  callback: SubscriptionCallback<T>,
  onUnsubscribe?: OnUnsubscribed,
) => Unsubscribe;
export type VoidSubscribeMethod = (callback: VoidSubscriptionCallback, onUnsubscribe?: OnUnsubscribed) => Unsubscribe;
export type VoidSubscribeByIdMethod = (
  subId: string,
  callback: VoidSubscriptionCallback,
  onUnsubscribe?: OnUnsubscribed,
) => Unsubscribe;

export type IsSubscribedMethod<T> = (callback: SubscriptionCallback<T>) => boolean;
export type IsSubscribedByIdMethod = (subId: string) => boolean;

export type UnsubscribeMethod<T> = (callback: SubscriptionCallback<T>) => void;
export type UnsubscribeByIdMethod = (subId: string) => void;

export type VoidIsSubscribedMethod = (callback: VoidSubscriptionCallback) => boolean;
export type VoidIsSubscribedByIdMethod = (subId: string) => boolean;

export type VoidUnsubscribeMethod = (callback: VoidSubscriptionCallback) => void;
export type VoidUnsubscribeByIdMethod = (subId: string) => void;

export type ChannelMethod<Data, Channel> = <D extends Data>(channel: Channel) => ISubscription<D, Channel>;
export type VoidChannelMethod<Channel> = (channel: Channel) => IVoidSubscription<Channel>;

export type DeferredMethod = <Result>(callback: () => Result) => Result;

export interface ISubscription<Data, Channel = any> {
  subscribe: SubscribeMethod<Data>;
  subscribeById: SubscribeByIdMethod<Data>;
  unsubscribe: UnsubscribeMethod<Data>;
  unsubscribeById: UnsubscribeByIdMethod;
  isSubscribed: IsSubscribedMethod<Data>;
  isSubscribedById: IsSubscribedByIdMethod;
  unsubscribeAll: UnsubscribeAllMethod;
  size: () => number;
  emit: (newValue: Data) => void;
  deferred: DeferredMethod;
  // unsubscribe all and forbid new subscriptions
  destroy: () => void;
  isDestroyed: () => boolean;
  // channel
  channel: ChannelMethod<Data, Channel>;
}

export interface IVoidSubscription<Channel = any> {
  subscribe: VoidSubscribeMethod;
  subscribeById: VoidSubscribeByIdMethod;
  unsubscribe: VoidUnsubscribeMethod;
  unsubscribeById: VoidUnsubscribeByIdMethod;
  isSubscribed: VoidIsSubscribedMethod;
  isSubscribedById: VoidIsSubscribedByIdMethod;
  unsubscribeAll: UnsubscribeAllMethod;
  size: () => number;
  emit: () => void;
  deferred: DeferredMethod;
  // unsubscribe all and forbid new subscriptions
  destroy: () => void;
  isDestroyed: () => boolean;
  // channel
  channel: VoidChannelMethod<Channel>;
}

export type MultiCreateChannelMethod = <Data>() => ISubscription<Data, never>;
export type MultiCreateVoidChannelMethod = () => IVoidSubscription<never>;

export interface IMultiSubscription {
  unsubscribeAll: UnsubscribeAllMethod;
  size: () => number;
  deferred: DeferredMethod;
  destroy: () => void;
  isDestroyed: () => boolean;
  createChannel: MultiCreateChannelMethod;
  createVoidChannel: MultiCreateVoidChannelMethod;
}

export interface ISubscriptionOptions {
  onFirstSubscription?: () => void;
  onLastUnsubscribe?: () => void;
  onDestroy?: () => void;
  maxSubscriptionCount?: number;
  maxRecursiveEmit?: number;
  maxUnsubscribeAllLoop?: number;
}

export const PubSub = (() => {
  interface SubscriptionItem<Data, Channel> {
    channel: Channel | typeof DEFAULT_CHANNEL;
    callback: SubscriptionCallback<Data>;
    subId: string | null;
    unsubscribe: Unsubscribe;
    onUnsubscribe: OnUnsubscribed | undefined;
  }

  const DEFAULT_CHANNEL = Symbol('DEFAULT_CHANNEL');

  return { createSubscription, createVoidSubscription, createMultiSubscription };

  function createMultiSubscription(): IMultiSubscription {
    const rootSub = createSubscription<any, symbol>();

    return {
      unsubscribeAll: rootSub.unsubscribeAll,
      size: rootSub.size,
      destroy: rootSub.destroy,
      isDestroyed: rootSub.isDestroyed,
      deferred: rootSub.deferred,
      createChannel,
      createVoidChannel,
    };

    function createChannel<Data>() {
      return rootSub.channel<Data>(Symbol());
    }

    function createVoidChannel(): IVoidSubscription<any> {
      return createChannel() as any;
    }
  }

  function createVoidSubscription<Channel = any>(options: ISubscriptionOptions = {}): IVoidSubscription<Channel> {
    return createSubscription<void>(options);
  }

  function createSubscription<Data, Channel = any>(options: ISubscriptionOptions = {}): ISubscription<Data, Channel> {
    const {
      onFirstSubscription,
      onLastUnsubscribe,
      onDestroy,
      maxRecursiveEmit = 1000,
      maxSubscriptionCount = 10000,
      maxUnsubscribeAllLoop = 1000,
    } = options;

    const subscriptions: Array<SubscriptionItem<Data, Channel>> = [];
    let nextSubscriptions: Array<SubscriptionItem<Data, Channel>> = [];
    const emitQueue: Array<{ value: Data; channel: Channel | typeof DEFAULT_CHANNEL }> = [];
    let isEmitting = false;
    let destroyed = false;

    return createChannel(DEFAULT_CHANNEL);

    function createChannel<D extends Data>(channel: Channel | typeof DEFAULT_CHANNEL): ISubscription<D, Channel> {
      const sub: ISubscription<Data> = {
        subscribe,
        subscribeById,
        unsubscribe,
        unsubscribeById,
        isSubscribed,
        isSubscribedById,
        unsubscribeAll,
        emit,
        deferred,
        size,
        destroy,
        isDestroyed,
        channel: createChannel,
      };

      return sub as any;

      function emit(newValue: Data): void {
        return emitInternal(channel, newValue);
      }

      function subscribe(callback: SubscriptionCallback<Data>, onUnsubscribe?: OnUnsubscribed): Unsubscribe {
        return subscribeInternal(channel, callback, null, onUnsubscribe);
      }

      function subscribeById(
        subId: string,
        callback: SubscriptionCallback<Data>,
        onUnsubscribe?: OnUnsubscribed,
      ): Unsubscribe {
        return subscribeInternal(channel, callback, subId, onUnsubscribe);
      }

      function unsubscribeAll(): void {
        return unsubscribeAllInternal(channel);
      }

      function unsubscribe(callback: SubscriptionCallback<Data>): void {
        unsubscribeInternal(null, callback);
      }

      function unsubscribeById(subId: string): void {
        unsubscribeInternal(subId);
      }

      function unsubscribeInternal(subId: string | null, callback?: SubscriptionCallback<Data>): void {
        const subscription = findSubscription(channel, subId, callback);
        if (subscription) {
          subscription.unsubscribe();
        }
      }

      function isSubscribed(callback: SubscriptionCallback<Data>): boolean {
        return isSubscribedInternal(null, callback);
      }

      function isSubscribedById(subId: string): boolean {
        return isSubscribedInternal(subId);
      }

      function isSubscribedInternal(subId: string | null, callback?: SubscriptionCallback<Data>): boolean {
        const subscription = findSubscription(channel, subId, callback);
        return subscription !== undefined;
      }

      function size(): number {
        return sizeInternal(channel);
      }
    }

    function sizeInternal(channel: Channel | typeof DEFAULT_CHANNEL): number {
      if (channel === DEFAULT_CHANNEL) {
        return subscriptions.length;
      }
      return subscriptions.filter((sub) => sub.channel === channel).length;
    }

    function isDestroyed() {
      return destroyed;
    }

    function destroy() {
      if (destroyed) {
        return;
      }
      destroyed = true;
      unsubscribeAllInternal(DEFAULT_CHANNEL);
      if (onDestroy) {
        onDestroy();
      }
    }

    function emitInternal(channel: Channel | typeof DEFAULT_CHANNEL, newValue: Data): void {
      if (destroyed) {
        throw PubSubErreur.SubscriptionDestroyed.create();
      }
      emitQueue.push({ value: newValue, channel });
      if (isEmitting) {
        return;
      }
      isEmitting = true;
      handleEmitQueue();
    }

    function deferred<Result>(callback: () => Result): Result {
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
          if (
            subItem.channel === DEFAULT_CHANNEL ||
            emitItem.channel === DEFAULT_CHANNEL ||
            subItem.channel === emitItem.channel
          ) {
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

    function unsubscribeAllInternal(channel: Channel | typeof DEFAULT_CHANNEL): void {
      let safe = maxUnsubscribeAllLoop + subscriptions.length;
      while (safe > 0) {
        if (subscriptions.length === 0) {
          break;
        }
        const nextItem = subscriptions.find((item) => channel === DEFAULT_CHANNEL || item.channel === channel);
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

    function subscribeInternal(
      channel: Channel | typeof DEFAULT_CHANNEL,
      callback: SubscriptionCallback<Data>,
      subId: string | null,
      onUnsubscribe: OnUnsubscribed | undefined,
    ): Unsubscribe {
      if (destroyed) {
        throw PubSubErreur.SubscriptionDestroyed.create();
      }

      if (typeof callback !== 'function') {
        throw PubSubErreur.InvalidCallback.create();
      }

      const alreadySubscribed = findSubscription(channel, subId, callback);

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
        channel,
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
        const index = subscriptions.findIndex(
          (i) => (channel === DEFAULT_CHANNEL || i.channel === channel) && i.callback === callback,
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
      channel: Channel | typeof DEFAULT_CHANNEL,
      subId: string | null,
      callback?: SubscriptionCallback<any>,
    ): SubscriptionItem<Data, Channel> | undefined {
      return subscriptions.find((item) => {
        if (channel !== DEFAULT_CHANNEL && item.channel !== channel) {
          return false;
        }
        return subId === null ? item.callback === callback : item.subId === subId;
      });
    }
  }
})();

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
