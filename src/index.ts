export type SubscriptionCallback<T> = [T] extends [void] ? (() => void) : ((value: T) => void);

export type Unsubscribe = () => void;

export interface SubscribeMethod<T> {
  (onChange: SubscriptionCallback<T>): Unsubscribe;
  (subId: string, onChange: SubscriptionCallback<T>): Unsubscribe;
}

export type IsSubscribedMethod<T> = (subId: string | SubscriptionCallback<T>) => boolean;
export type UnsubscribeMethod<T> = (subId?: string | SubscriptionCallback<T>) => void;

export interface Subscription<T> {
  subscribe: SubscribeMethod<T>;
  unsubscribe: UnsubscribeMethod<T>;
  isSubscribed: IsSubscribedMethod<T>;
  call: [T] extends [void] ? (() => void) : ((newValue: T) => void);
}

interface Options {
  onFirstSubscription?: () => void;
  onLastUnsubscribe?: () => void;
}

interface SubscriptionItem<T> {
  listener: SubscriptionCallback<T>;
  subId: string | null;
  unsubscribe: Unsubscribe;
}

export const Subscription = {
  create<T>(options: Options = {}): Subscription<T> {
    const { onFirstSubscription, onLastUnsubscribe } = options;

    let listeners: Array<SubscriptionItem<T>> = [];
    let callQueue: Array<SubscriptionItem<T>> = [];

    function call(newValue: T): void {
      callQueue = [...listeners];
      let safe = 10000;
      while (safe > 0 && callQueue.length > 0) {
        const item = callQueue.shift();
        if (item) {
          item.listener(newValue);
        }
      }
      if (safe <= 0) {
        throw new Error('Hit safe in while loop');
      }
    }

    function subscribe(listener: SubscriptionCallback<T>): Unsubscribe;
    function subscribe(subId: string, listener: SubscriptionCallback<T>): Unsubscribe;
    function subscribe(arg1: string | SubscriptionCallback<T>, arg2?: SubscriptionCallback<T>): Unsubscribe {
      const subId = typeof arg1 === 'string' ? arg1 : null;
      const listener = typeof arg1 === 'string' ? (arg2 as SubscriptionCallback<T>) : arg1;

      if (typeof listener !== 'function') {
        throw new Error('Expected the listener to be a function.');
      }

      if (subId !== null) {
        unsubscribe(subId);
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
        if (index >= 0) {
          listeners.splice(index, 1);
        }
        if (listeners.length === 0 && onLastUnsubscribe) {
          onLastUnsubscribe();
        }
        const queueIndex = callQueue.findIndex(i => i.listener === listener);
        if (queueIndex >= 0) {
          callQueue.splice(queueIndex, 1);
        }
      }

      return unsubscribeCurrent;
    }

    function unsubscribe(subId?: string | SubscriptionCallback<T>): void {
      if (subId === undefined) {
        while (listeners.length > 0) {
          listeners[0].unsubscribe();
        }
        while (callQueue.length > 0) {
          callQueue[0].unsubscribe();
        }
        return;
      }
      if (typeof subId === 'string') {
        const foundInListeners = listeners.find(i => i.subId === subId);
        if (foundInListeners) {
          foundInListeners.unsubscribe();
        }
        const foundInQueue = callQueue.find(i => i.subId === subId);
        if (foundInQueue) {
          foundInQueue.unsubscribe();
        }
        return;
      }
      const foundInListeners = listeners.find(i => i.listener === subId);
      if (foundInListeners) {
        foundInListeners.unsubscribe();
      }
      const foundInQueue = callQueue.find(i => i.listener === subId);
      if (foundInQueue) {
        foundInQueue.unsubscribe();
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
      isSubscribed,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      call: call as any,
    };
  },
};
