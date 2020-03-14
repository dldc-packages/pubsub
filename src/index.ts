export type SubscriptionCallback<T> = [T] extends [void]
  ? () => void
  : (value: T) => void;

export type Unsubscribe = () => void;

export interface SubscribeMethod<T> {
  (onChange: SubscriptionCallback<T>): Unsubscribe;
  (subId: string, onChange: SubscriptionCallback<T>): Unsubscribe;
}

export type IsSubscribedMethod<T> = (
  subId: string | SubscriptionCallback<T>
) => boolean;
export type UnsubscribeMethod<T> = (
  subId: string | SubscriptionCallback<T>
) => void;
export type UnsubscribeAllMethod = () => void;

export interface Subscription<T> {
  subscribe: SubscribeMethod<T>;
  unsubscribe: UnsubscribeMethod<T>;
  unsubscribeAll: UnsubscribeAllMethod;
  isSubscribed: IsSubscribedMethod<T>;
  call: [T] extends [void] ? () => void : (newValue: T) => void;
}

interface Options {
  onFirstSubscription?: () => void;
  onLastUnsubscribe?: () => void;
  maxListenerCount?: number;
  maxRecursiveCall?: number;
}

interface SubscriptionItem<T> {
  listener: SubscriptionCallback<T>;
  subId: string | null;
  unsubscribe: Unsubscribe;
}

export const Subscription = {
  create<T = void>(options: Options = {}): Subscription<T> {
    const {
      onFirstSubscription,
      onLastUnsubscribe,
      maxRecursiveCall = 1000,
      maxListenerCount = 10000
    } = options;

    let listeners: Array<SubscriptionItem<T>> = [];
    let nextListenersCall: Array<SubscriptionItem<T>> = [];
    const callQueue: Array<{ value: T }> = [];
    let isCalling = false;

    function call(newValue: T): void {
      callQueue.push({ value: newValue });
      if (isCalling) {
        return;
      }
      isCalling = true;
      let callQueueSafe = maxRecursiveCall + 1; // add one because we don't count the first one
      while (callQueueSafe > 0 && callQueue.length > 0) {
        callQueueSafe--;
        const value = callQueue.shift()!.value;
        nextListenersCall = [...listeners];
        let safe = maxListenerCount;
        while (safe > 0 && nextListenersCall.length > 0) {
          safe--;
          // cannot be undefined because length > 0
          const item = nextListenersCall.shift()!;
          item.listener(value);
        }
        if (safe <= 0) {
          isCalling = false;
          throw new Error(
            'The maxListenerCount has been reached. ' +
              'If this is expected you can use the maxListenerCount option to raise the limit'
          );
        }
      }
      if (callQueueSafe <= 0) {
        isCalling = false;
        throw new Error(
          'The maxRecursiveCall has been reached, did you call() in a listener ? ' +
            'If this is expected you can use the maxRecursiveCall option to raise the limit'
        );
      }
      isCalling = false;
    }

    function subscribe(listener: SubscriptionCallback<T>): Unsubscribe;
    function subscribe(
      subId: string,
      listener: SubscriptionCallback<T>
    ): Unsubscribe;
    function subscribe(
      arg1: string | SubscriptionCallback<T>,
      arg2?: SubscriptionCallback<T>
    ): Unsubscribe {
      const subId = typeof arg1 === 'string' ? arg1 : null;
      const listener =
        typeof arg1 === 'string' ? (arg2 as SubscriptionCallback<T>) : arg1;

      if (typeof listener !== 'function') {
        throw new Error('Expected the listener to be a function.');
      }

      const alreadySubscribed =
        subId === null
          ? listeners.find(l => l.listener === listener)
          : listeners.find(l => l.subId === subId);

      if (alreadySubscribed) {
        if (subId !== null && alreadySubscribed.listener !== listener) {
          // We have a subId and the listener is not the same so we should unsub before re-sub
          unsubscribe(subId);
          // then keep going with the normal subscription
        } else {
          // move the subscription to the end
          const subIndex = listeners.indexOf(alreadySubscribed);
          listeners.splice(subIndex, 1);
          listeners.push(alreadySubscribed);
          // return the unsub
          return alreadySubscribed.unsubscribe;
        }
      }

      let isSubscribed = true;

      listeners.push({ subId, listener, unsubscribe: unsubscribeCurrent });
      if (listeners.length === 1 && onFirstSubscription) {
        onFirstSubscription();
      }

      function unsubscribeCurrent(): void {
        if (!isSubscribed) {
          return;
        }
        isSubscribed = false;
        const index = listeners.findIndex(i => i.listener === listener);

        // isSubscribed is true but the listener is not in the list
        // if this happens we ignore the unsub
        /* istanbul ignore next */
        if (index === -1) {
          console.warn(
            `Subscribe (isSubscribed === true) listener is not in the listeners list. Please report a bug.`
          );
        } else {
          listeners.splice(index, 1);
        }
        if (listeners.length === 0 && onLastUnsubscribe) {
          onLastUnsubscribe();
        }
        const queueIndex = nextListenersCall.findIndex(
          i => i.listener === listener
        );
        if (queueIndex >= 0) {
          nextListenersCall.splice(queueIndex, 1);
        }
      }

      return unsubscribeCurrent;
    }

    function unsubscribeAll(): void {
      while (listeners.length > 0) {
        listeners[0].unsubscribe();
      }
      // Note: we don't need to clear the call queue because the unsubscribe() will take care of it
      return;
    }

    function unsubscribe(subId: string | SubscriptionCallback<T>): void {
      if (typeof subId === 'string') {
        const foundInListeners = listeners.find(i => i.subId === subId);
        if (foundInListeners) {
          foundInListeners.unsubscribe();
        }
        return;
      }
      const foundInListeners = listeners.find(i => i.listener === subId);
      if (foundInListeners) {
        foundInListeners.unsubscribe();
      }
    }

    function isSubscribed(subId: string | SubscriptionCallback<T>): boolean {
      if (typeof subId === 'string') {
        const foundInListeners = listeners.find(i => i.subId === subId);
        return foundInListeners !== undefined;
      }
      const foundInListeners = listeners.find(i => i.listener === subId);
      return foundInListeners !== undefined;
    }

    return {
      subscribe,
      unsubscribe,
      unsubscribeAll,
      isSubscribed,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      call: call as any
    };
  }
};
