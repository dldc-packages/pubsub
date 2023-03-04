<p align="center">
  <img src="https://raw.githubusercontent.com/etienne-dldc/suub/main/design/logo.png" width="597" alt="suub logo">
</p>

# 📫 Suub [![Build Status](https://travis-ci.org/etienne-dldc/suub.svg?branch=master)](https://travis-ci.org/etienne-dldc/suub) [![](https://badgen.net/bundlephobia/minzip/suub)](https://bundlephobia.com/result?p=suub)

> A simple pub/sub written in Typescript

## Gist

```ts
import { Subscription } from 'suub';

const mySub = Subscription.create<number>();

const unsub = mySub.subscribe((num) => {
  console.log('num: ' + num);
});

mySub.emit(45); // num: 45

unsub();
```

## Guide

### Creating a Subscription

To create a `Subscription` you need to import the `Subscription.create` function and call it.

```ts
import { Subscription } from 'suub';

const subscription = Subscription.create();
```

If you use TypeScript, you need to pass a type parameter to the `Subscription.create` function to define the type of the value associated with the subscription.

```ts
import { Subscription } from 'suub';

const numSubscription = Subscription.create<number>();
```

If you don't want your subscription not to emit any value, you can use the `Subscription.createVoid` function.

```ts
import { Subscription } from 'suub';

const voidSubscription = Subscription.createVoid();
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
subscription.subscribe('mySubId', () => {
  /*...*/
});
// later
subscription.unsubscribe('mySubId');
```

In both case the `subscribe` return a function that will unsubscribe:

```ts
const unsub = subscription.subscribe(/*...*/);
// later
unsub();
```

### Emitting value

To emit a value and trigger all subscribed `callback` you need to call the `emit` method.

```ts
subscription.emit(42);
// you can also emit with no value
subscription.emit();
```

### OnUnsubscribe

The `subscribe` method accept a optional function after the callback, this function will be called when this callback you are subscribing is unsubscribed.

```ts
subscription.subscribe(
  () => {
    /* ... */
  },
  () => {
    console.log('Unsubscribed !');
  }
);

// or with a subId
subscription.subscribe(
  'mySub',
  () => {
    /* ... */
  },
  () => {
    console.log('Unsubscribed !');
  }
);
```

### Unsubscribing all callback

You can call `unsubscribeAll` method on a subscription to remove all callback. This will also trigger the `onUnsubscribe` if any.

```ts
subscription.unsubscribeAll();
```

### `Subscription` options

The `Subscription.create` (or `Subscription.createVoid`) function accept an option object as parameter (all properties are optional):

```ts
const sub = Subscription.create({
  onFirstSubscription: () => {},
  onLastUnsubscribe: () => {},
  onDestroy: () => {},
  maxSubscriptionCount: 10000,
  maxRecursiveCall: 1000,
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

#### `maxRecursiveCall`

> A number to limit the maximum recursive call of `emit` (defaumt is `1000`). This limit exist to detect infinite loop where you `emit` in a `callback`.

### Testing if a callback / subId is subscribed

The `isSubscribed` let you test whether or not a callback / subId is currently subscribed

```ts
subscription.isSubscribed(myCallback); // <- boolean
subscription.isSubscribed('my-sub-id'); // <- boolean
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

Once destroyed, calling `emit` or `subscribe` will throw an error. You can still call the other methods but they will have no effect.

You can check if a subscription is destroyed by calling the `isDestroyed` method.

```ts
subscription.isDestroyed(); // <- boolean
```

## Some precisions

#### Callback are called in the order they are subscribed.

#### If you re-subscribe the same callback it will not re-do a subscription but instead move the subscription to the end.

In other words, calling `subscribe` on an already subscribed callback or subId will not make the callback called twice. But it will move the callback at the end of the subscription list.

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

## Examples

Take a look at the [Examples folder](https://github.com/etienne-dldc/suub/tree/master/examples).

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
  maxRecursiveCall?: number;
}
```
