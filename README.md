<p align="center">
  <img src="https://raw.githubusercontent.com/dldc-packages/pubsub/main/design/logo.png" width="597" alt="pubsub logo">
</p>

# 📫 PubSub

> A simple pub/sub written in Typescript

```
npm install @dldc/pubsub
```

## Gist

```ts
import { PubSub } from '@dldc/pubsub';

const mySub = PubSub.createSubscription<number>();

const unsub = mySub.subscribe((num) => {
  console.log('num: ' + num);
});

mySub.emit(45); // num: 45

unsub();
```

## Guide

### Creating a Subscription

To create a `Subscription` you need to import the `PubSub.createSubscription` function and call it.

```ts
import { PubSub } from '@dldc/pubsub';

const subscription = PubSub.createSubscription();
```

If you use TypeScript, you need to pass a type parameter to the `PubSub.createSubscription` function to define the type of the value associated with the subscription.

```ts
import { PubSub } from '@dldc/pubsub';

const numSubscription = PubSub.createSubscription<number>();
```

If you don't want your subscription not to emit any value, you can use the `PubSub.createVoidSubscription` function.

```ts
import { PubSub } from '@dldc/pubsub';

const voidSubscription = PubSub.createVoidSubscription();
```

### Subscribe and Unsubscribe

You have two ways to `subscribe` / `unsubscribe`.

- Using the reference of the callback function

```ts
const callback = () => {
  /*...*/
};

subscription.subscribe(callback);
// later
subscription.unsubscribe(callback);
```

- Using a SubId (a string)

```ts
subscription.subscribeById('mySubId', () => {
  /*...*/
});
// later
subscription.unsubscribeById('mySubId');
```

In both case the `subscribe[ById]` return a function that will unsubscribe:

```ts
const unsub = subscription.subscribe(/*...*/);
// later
unsub();
```

### Emitting value

To emit a value and trigger all subscribed `callback` you need to call the `emit` method.

```ts
subscription.emit(42);
// for void subscription you don't need to pass any value
subscription.emit();
```

### OnUnsubscribe

The `subscribe[ById]` methods accept a optional function after the callback, this function will be called when this callback you are subscribing is unsubscribed.

```ts
subscription.subscribe(
  () => {
    /* ... */
  },
  () => {
    console.log('Unsubscribed !');
  },
);

// or with a subId
subscription.subscribeById(
  'mySub',
  () => {
    /* ... */
  },
  () => {
    console.log('Unsubscribed !');
  },
);
```

### Unsubscribing all subscriptions

You can call `unsubscribeAll` method on a subscription to remove all callback. This will also trigger the `onUnsubscribe` if any.

```ts
subscription.unsubscribeAll();
```

### `Subscription` options

The `Subscription.create` (or `Subscription.createVoid`) functions accept an option object as parameter (all properties are optional):

```ts
const sub = Subscription.create({
  onFirstSubscription: () => {},
  onLastUnsubscribe: () => {},
  onDestroy: () => {},
  maxSubscriptionCount: 10000,
  maxRecursiveEmit: 1000,
  maxUnsubscribeAllLoop: 1000,
});
```

#### `onFirstSubscription`

> A function called when the number of subscribers goes from `0` to `1`

#### `onLastUnsubscribe`

> A function called when the number of subscribers goes from `1` to `0`

#### `onDestroy`

> A function called when the `destroy` method is called. Note that during this call the `Subscription` is already destroyed and you can't call `emit` or `subscribe` anymore.

#### `maxSubscriptionCount`

> A number to limit the maximum number of simultaneous subscriptions (default is `10000`). This limit exist to detect infinit subscription loop.

#### `maxRecursiveEmit`

> A number to limit the maximum recursive call of `emit` (default is `1000`). This limit exist to detect infinite loop where you `emit` in a `callback`.

#### `maxUnsubscribeAllLoop`

> A number to limit the maximum recursive call of `subscribe` inside a `onUnsubscribe` callback (default is `1000`).

### Testing if a callback / subId is subscribed

The `isSubscribed[ById]` methods let you test whether or not a callback / subId is currently subscribed

```ts
subscription.isSubscribed(myCallback); // <- boolean
subscription.isSubscribedById('my-sub-id'); // <- boolean
```

### Reading the number of active Subscriptions

You can call the `size` method to get the number of subscriptions.

```ts
subscription.size();
```

### Destroying a Subscription

You can call the `destroy` method to destroy a subscription. This will unsubscribe all callback and call the `onDestroy` option if any.

```ts
subscription.destroy();
```

Once destroyed, calling `emit` or `subscribe[ById]` will throw an error. You can still call the other methods but they will have no effect.

You can check if a subscription is destroyed by calling the `isDestroyed` method.

```ts
subscription.isDestroyed(); // <- boolean
```

## Channels

```
// TODO
```

## Some precisions

#### Callback are called in the order they are subscribed.

#### If you re-subscribe the same callback or id it will not re-do a subscription but instead move the subscription to the end.

In other words, calling `subscribe` on an already subscribed callback or subId will not make the callback called twice. But it will move the callback at the end of the subscription list.
In the case of a subId, the callback will be replaced by the new one.

#### If you call `unsubscribe` in a callback it will have effect immediatly.

If the callback you unsubscribe is supposed to run after the current callback, it will not be called.

#### If you `subscribe` in a callback it will not be called immediatly.

But it will be in the next `emit`.

#### If you `emit()` in a callback it will defer the call to after the current emit is done.

#### If you `subscribe` / `unsubscribe` / `emit` in an `onUnsubscribed` it will behave the same as if it was in the callback itself

#### Calling `destroy` will unsubscribe all callback and call the `onUnsubscribe` if any

In these `onUnsubscribe` callback the subscription is considered destroyed so you can't call `emit` or `subscribe` anymore.

#### Calling `destroy` on a destroyed subscription will have no effect

This is a no-op, it will not call `onDestroy` again.

#### The subscription is already considered destroyed when `onDestroy` is called

This means that you can't call `emit` or `subscribe` in the `onDestroy` callback and that `isDestroyed` will return `true` in the `onDestroy` callback.

## API

```ts
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
  destroy: () => void;
  isDestroyed: () => boolean;
}

export interface IVoidSubscription {
  subscribe: VoidSubscribeMethod;
  unsubscribe: VoidUnsubscribeMethod;
  unsubscribeAll: UnsubscribeAllMethod;
  isSubscribed: VoidIsSubscribedMethod;
  size: () => number;
  emit: () => void;
  destroy: () => void;
  isDestroyed: () => boolean;
}

export interface ISubscriptionOptions {
  onFirstSubscription?: () => void;
  onLastUnsubscribe?: () => void;
  onDestroy?: () => void;
  maxSubscriptionCount?: number;
  maxRecursiveEmit?: number;
}
```
