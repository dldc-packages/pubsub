<p align="center">
  <img src="https://github.com/etienne-dldc/suub/blob/master/design/logo.png" width="597" alt="suub logo">
</p>

# 📫 Suub [![Build Status](https://travis-ci.org/etienne-dldc/suub.svg?branch=master)](https://travis-ci.org/etienne-dldc/suub) [![](https://badgen.net/bundlephobia/minzip/suub)](https://bundlephobia.com/result?p=suub) [![codecov](https://codecov.io/gh/etienne-dldc/suub/branch/master/graph/badge.svg)](https://codecov.io/gh/etienne-dldc/suub)

> A simple pub/sub written in Typescript

## Gist

```ts
import { Subscription } from 'suub';

const mySub = Subscription<number>();

const unsub = mySub.subscribe(num => {
  console.log('num: ' + name);
});

mySub.emit(45); // num: 45

unsub();
```

## Guide

### Creating a Subscription

To create a `Subscription` you need to import the `Subscription` function and call it.

```ts
import { Subscription } from 'suub';

const subscription = Subscription();
```

If you use TypeScript, you need to pass a type parameter to the `Subscription` function to define the type of the value associated with the subscription. By default this type is `void` (no value).

```ts
import { Subscription } from 'suub';

const numSubscription = Subscription<number>();
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

The `Subscription` function accept an option object as parameter (all properties are optional):

```ts
const sub = Subscription({
  onFirstSubscription: () => {},
  onLastUnsubscribe: () => {},
  maxSubscriptionCount: 10000,
  maxRecursiveCall: 1000
});
```

#### `onFirstSubscription`

> A function called when the number of subscribers goes from `0` to `1`

#### `onLastUnsubscribe`

> A function called when the number of subscribers goes from `1` to `0`

#### `maxSubscriptionCount`

> A number to limit the maximum number of simultaneous subscriptions (default is `10000`). This limit exist to detect infinit subscription loop.

#### `maxRecursiveCall`

> A number to limit the maximum recursive call of `emit` (defaumt is `1000`). This limit exist to detect infinite loop where you `emit` in a `callback`.

### Testing if a callbacl / subId is subscribed

The `isSubscribed` let you test whether a callbacl / subId is currently subscribed

```ts
subscription.isSubscribed(myCallback); // <- boolean
subscription.isSubscribed('my-sub-id'); // <- boolean
```

### Reading the number of active Subscriptions

You can call the `size` method to get the number of subscriptions.

```ts
subscription.size();
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

export interface Subscription<T> {
  subscribe: SubscribeMethod<T>;
  unsubscribe: UnsubscribeMethod<T>;
  unsubscribeAll: UnsubscribeAllMethod;
  isSubscribed: IsSubscribedMethod<T>;
  size: () => number;
  emit: (newValue: T) => void;
}

export interface VoidSubscription {
  subscribe: VoidSubscribeMethod;
  unsubscribe: VoidUnsubscribeMethod;
  unsubscribeAll: UnsubscribeAllMethod;
  isSubscribed: VoidIsSubscribedMethod;
  size: () => number;
  emit: () => void;
}

export interface SubscriptionOptions {
  onFirstSubscription?: () => void;
  onLastUnsubscribe?: () => void;
  maxSubscriptionCount?: number;
  maxRecursiveCall?: number;
}

export function Subscription<T = void>(
  options: SubscriptionOptions = {}
): [T] extends [void] ? VoidSubscription : Subscription<T>;
```
