<p align="center">
  <img src="https://github.com/etienne-dldc/suub/blob/master/design/logo.png" width="597" alt="suub logo">
</p>

# 📫 Suub [![Build Status](https://travis-ci.org/etienne-dldc/suub.svg?branch=master)](https://travis-ci.org/etienne-dldc/suub) [![](https://badgen.net/bundlephobia/minzip/chemin)](https://bundlephobia.com/result?p=chemin)

> A simple pub/sub written in Typescript

## Gist

```ts
import { Subscription } from '../dist';

const mySub = Subscription.create<number>();

const unsub = mySub.subscribe(num => {
  console.log('num: ' + name);
});

mySub.call(45); // num: 45

unsub();
```

## Reference / SubId

You have two ways to `subscribe` / `unsubscribe`.

- Using the reference of the listener

```ts
const mySub = () => {
  /*...*/
};
subscription.subscribe(mySub);
// later
subscription.unsubscribe(mySub);
```

- Using a SubId

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

## A few details

#### Listeners are called in the order they are subscribed.

#### If you re-subscribe the same listener it will not re-do a subscription but instead move the subscription to the end.

In other word, calling `subscribe` on an already subscribed listener is the same as calling `unsubscribe` then `subscribe` on that listener except you get the same `unsubscribe` reference back.

#### If you call `unsubscribe` in a listener it will have effect immediatly.

If the listener you unsubscribe is supposed to run after the current listener, it will not be called.

#### If you `subscribe` in a listener it will not be called immediatly.

But it will be in the next `call`.

## Examples

Take a look at the [Examples folder](https://github.com/etienne-dldc/suub/tree/master/examples).

## API

### Subscription.create<T>(options: Options): Subscription<T>

> Create a new Subscription

- `options.onFirstSubscription?`: A function called when the subscriber count goes from 0 to 1
- `options.onLastUnsubscribe?`: A function called when the subscriber count goes from 1 to 0

**Note**: by default the `T` type is `void` meaning the `Subscription` has no data.

### Subscription&lt;T&gt;

> A subscription object

### Subscription&lt;T&gt;.subscribe([subId, ] listener): Unsubscribe

> Add a subscriber

- `subId` (optional): Associate an id with the listener to be able to `unsubscribe` by this same id.
- `listener`: The function that will be called when you `call`, this function receive a value as parameter (of type `T`)
- return `Unsubscribe`: returns a function that will unsubscribe the listener.

### Subscription&lt;T&gt;.call(value: T)

> Call all listeners in the same order they were subscribed

- `value`: The value (of type `T`) that will be passed to the listeners

**Note**: If `T` is `void` this function does not take any arguments.

### Subscription&lt;T&gt;.unsubscribeAll()

> Unsubscribe all listeners

### Subscription&lt;T&gt;.unsubscribe(listener)

> Unsubscribe a listener either by reference or by id

- `listener`: Either an id (`string`) or a reference to a listener

### Subscription&lt;T&gt;.isSubscribed(listener): boolean

> Test wether a listener id subscribed or not

- `listener`: Either an id (`string`) or a reference to a listener
