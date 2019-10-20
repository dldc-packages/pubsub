<p align="center">
  <img src="https://github.com/etienne-dldc/suub/blob/master/design/logo.png" width="597" alt="suub logo">
</p>

# 📫 Suub

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

## Examples

Take a look at the [Examples folder](https://github.com/etienne-dldc/suub/tree/master/examples).

## API

### `Subscription.create<T>(options: Options): Subscription<T>`

> Create a new Subscription

- `options.onFirstSubscription?`: A function called when the subscriber count goes from 0 to 1
- `options.onLastUnsubscribe?`: A function called when the subscriber count goes from 1 to 0

**Note**: by default the `T` type is `void` meaning the `Subscription` has no data.

### Subscription<T>

> A subscription object

### `Subscription<T>.subscribe([subId, ] listener): Unsubscribe`

> Add a subscriber

- `subId` (optional): Associate an id with the listener to be able to `unsubscribe` by this same id.
- `listener`: The function that will be called when you `call`, this function receive a value as parameter (of type `T`)
- return `Unsubscribe`: returns a function that will unsubscribe the listener.

### `Subscription<T>.call(value: T)`

> Call all listeners in the same order they were subscribed

- `value`: The value (of type `T`) that will be passed to the listeners

**Note**: If `T` is `void` this function does not take any arguments.

### `Subscription<T>.unsubscribe(listener)`

> Unsubscribe a listener either by reference or by id

- `listener`: Either an id (`string`) or a reference to a listener

### `Subscription<T>.isSubscribed(listener): boolean`

> Test wether a listener id subscribed or not

- `listener`: Either an id (`string`) or a reference to a listener
