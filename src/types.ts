export type TUnsubscribe = () => void;
export type TOnUnsubscribed = () => void;
export type TSubscriptionCallback<T> = (value: T) => void;
export type VoidSubscriptionCallback = () => void;
export type UnsubscribeAllMethod = () => void;

export type SubscribeMethod<T> = (
  callback: TSubscriptionCallback<T>,
  onUnsubscribe?: TOnUnsubscribed,
) => TUnsubscribe;
export type SubscribeByIdMethod<T> = (
  subId: string,
  callback: TSubscriptionCallback<T>,
  onUnsubscribe?: TOnUnsubscribed,
) => TUnsubscribe;
export type VoidSubscribeMethod = (
  callback: VoidSubscriptionCallback,
  onUnsubscribe?: TOnUnsubscribed,
) => TUnsubscribe;
export type VoidSubscribeByIdMethod = (
  subId: string,
  callback: VoidSubscriptionCallback,
  onUnsubscribe?: TOnUnsubscribed,
) => TUnsubscribe;

export type IsSubscribedMethod<T> = (
  callback: TSubscriptionCallback<T>,
) => boolean;
export type IsSubscribedByIdMethod = (subId: string) => boolean;

export type UnsubscribeMethod<T> = (callback: TSubscriptionCallback<T>) => void;
export type UnsubscribeByIdMethod = (subId: string) => void;

export type VoidIsSubscribedMethod = (
  callback: VoidSubscriptionCallback,
) => boolean;
export type VoidIsSubscribedByIdMethod = (subId: string) => boolean;

export type VoidUnsubscribeMethod = (
  callback: VoidSubscriptionCallback,
) => void;
export type VoidUnsubscribeByIdMethod = (subId: string) => void;

export type BatchMethod = <Result>(callback: () => Result) => Result;
