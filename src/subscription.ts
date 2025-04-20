import { IS_SUBSCRIPTION } from "./internal.ts";
import {
  createScheduler,
  type TScheduler,
  type TSchedulerOptions,
} from "./scheduler.ts";
import type {
  BatchMethod,
  IsSubscribedByIdMethod,
  IsSubscribedMethod,
  SubscribeByIdMethod,
  SubscribeMethod,
  TOnUnsubscribed,
  TSubscriptionCallback,
  TUnsubscribe,
  UnsubscribeAllMethod,
  UnsubscribeByIdMethod,
  UnsubscribeMethod,
  VoidIsSubscribedByIdMethod,
  VoidIsSubscribedMethod,
  VoidSubscribeByIdMethod,
  VoidSubscribeMethod,
  VoidUnsubscribeByIdMethod,
  VoidUnsubscribeMethod,
} from "./types.ts";
import { isScheduler } from "./utils.ts";

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

export function createVoidSubscription(
  scheduler?: TSchedulerOptions,
): TVoidSubscription;
export function createVoidSubscription(
  scheduler: TScheduler,
  options?: TSubscriptionOptions,
): TVoidSubscription;
export function createVoidSubscription(
  scheduler: TSchedulerOptions | TScheduler = {},
  options: TSubscriptionOptions = {},
): TVoidSubscription {
  return createSubscriptionInternal<void>(scheduler, options);
}

export function createSubscription<Data>(
  scheduler?: TSchedulerOptions,
): TSubscription<Data>;
export function createSubscription<Data>(
  scheduler?: TScheduler,
  options?: TSubscriptionOptions,
): TSubscription<Data>;
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

  function subscribe(
    callback: TSubscriptionCallback<Data>,
    onUnsubscribe?: TOnUnsubscribed,
  ): TUnsubscribe {
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
