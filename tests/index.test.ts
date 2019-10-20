import { Subscription } from '../src';

test('Basic subscription', () => {
  const sub = Subscription.create<number>();
  const cb1 = jest.fn();
  const unsub1 = sub.subscribe(cb1);
  sub.call(42);
  unsub1();
  sub.call(3);
  expect(sub.isSubscribed(cb1)).toBe(false);
  expect(cb1).toHaveBeenCalledTimes(1);
  expect(cb1).toHaveBeenCalledWith(42);
});

test('Id subscription', () => {
  const sub = Subscription.create<number>();
  const cb1 = jest.fn();
  sub.subscribe('sub1', cb1);
  sub.call(42);
  sub.unsubscribe('sub1');
  sub.call(3);
  expect(sub.isSubscribed(cb1)).toBe(false);
  expect(cb1).toHaveBeenCalledTimes(1);
  expect(cb1).toHaveBeenCalledWith(42);
});

test('Ref subscription', () => {
  const sub = Subscription.create<number>();
  const cb1 = jest.fn();
  sub.subscribe('sub1', cb1);
  sub.call(42);
  sub.unsubscribe(cb1);
  sub.call(3);
  expect(sub.isSubscribed(cb1)).toBe(false);
  expect(cb1).toHaveBeenCalledTimes(1);
  expect(cb1).toHaveBeenCalledWith(42);
});

test('unsub unsubscribed ref does not throw', () => {
  const sub = Subscription.create<number>();
  const cb1 = jest.fn();
  expect(sub.isSubscribed(cb1)).toBe(false);
  expect(() => {
    sub.unsubscribe(cb1);
  }).not.toThrow();
});

test('Resubscribe the same cb should do nothing', () => {
  const sub = Subscription.create<number>();
  const cb1 = jest.fn();
  sub.subscribe(cb1);
  sub.call(42);
  sub.subscribe(cb1);
  sub.call(3);
  expect(cb1).toHaveBeenCalledTimes(2);
  expect(cb1).toHaveBeenCalledWith(42);
  expect(cb1).toHaveBeenCalledWith(3);
});

test('Resubscribe the same subId should unsub the previous one', () => {
  const sub = Subscription.create<number>();
  const cb1 = jest.fn();
  const cb2 = jest.fn();
  sub.subscribe('sub1', cb1);
  sub.call(42);
  sub.subscribe('sub1', cb2);
  sub.call(3);
  expect(cb1).toHaveBeenCalledTimes(1);
  expect(cb2).toHaveBeenCalledTimes(1);
  expect(cb1).toHaveBeenCalledWith(42);
  expect(cb2).toHaveBeenCalledWith(3);
});

test('Unsub twice should not throw an error', () => {
  const sub = Subscription.create<number>();
  const cb1 = jest.fn();
  const unsub = sub.subscribe('sub1', cb1);
  unsub();
  expect(() => {
    unsub();
  }).not.toThrow();
});

test('If cb remove a listener not called yet it should not call it', () => {
  const sub = Subscription.create<number>();
  const cb1 = () => {
    sub.unsubscribe(cb2);
  };
  const cb2 = jest.fn();
  sub.subscribe(cb1);
  sub.subscribe(cb2);
  sub.call(42);
  expect(cb2).not.toHaveBeenCalled();
});

test('If a cb remove a listener by subId not called yet it should not call it', () => {
  const sub = Subscription.create<number>();
  const cb1 = () => {
    sub.unsubscribe('sub2');
  };
  const cb2 = jest.fn();
  sub.subscribe(cb1);
  sub.subscribe('sub2', cb2);
  sub.call(42);
  expect(cb2).not.toHaveBeenCalled();
  expect(sub.isSubscribed('sub2')).toBe(false);
});

test('If cb remove a listener already called it should not skip cb', () => {
  const sub = Subscription.create<number>();
  const cb1 = jest.fn();
  const cb2 = jest.fn(() => {
    sub.unsubscribe(cb1);
  });
  const cb3 = jest.fn();
  const cb4 = jest.fn();
  sub.subscribe(cb1);
  sub.subscribe(cb2);
  sub.subscribe(cb3);
  sub.subscribe(cb4);
  sub.call(42);
  expect(cb1).toHaveBeenCalledTimes(1);
  expect(cb2).toHaveBeenCalledTimes(1);
  expect(cb3).toHaveBeenCalledTimes(1);
  expect(cb4).toHaveBeenCalledTimes(1);
});

test('adding a listener in a cb should not call it until the next call()', () => {
  const sub = Subscription.create<number>();
  const cb1 = jest.fn();
  const cb2 = jest.fn(() => {
    sub.subscribe(cb3);
  });
  const cb3 = jest.fn();
  sub.subscribe(cb1);
  sub.subscribe(cb2);
  sub.call(42);
  expect(cb1).toHaveBeenCalledTimes(1);
  expect(cb2).toHaveBeenCalledTimes(1);
  expect(cb3).not.toHaveBeenCalled();
  sub.call(3);
  expect(cb1).toHaveBeenCalledTimes(2);
  expect(cb2).toHaveBeenCalledTimes(2);
  expect(cb3).toHaveBeenCalledTimes(1);
});

test('calling unsubscribeAll should work', () => {
  const sub = Subscription.create<number>();
  const cb1 = jest.fn();
  const cb2 = jest.fn();
  const cb3 = jest.fn();
  sub.subscribe(cb1);
  sub.subscribe(cb2);
  sub.subscribe(cb3);
  sub.call(42);
  expect(cb1).toHaveBeenCalledTimes(1);
  expect(cb2).toHaveBeenCalledTimes(1);
  expect(cb3).toHaveBeenCalledTimes(1);
  sub.unsubscribeAll();
  expect(cb1).toHaveBeenCalledTimes(1);
  expect(cb2).toHaveBeenCalledTimes(1);
  expect(cb3).toHaveBeenCalledTimes(1);
});

test('subscribing twice the same listener with subId should return the same unsub', () => {
  const sub = Subscription.create<number>();
  const cb1 = jest.fn();
  const unsub1 = sub.subscribe('sub', cb1);
  const unsub2 = sub.subscribe('sub', cb1);
  expect(unsub1).toBe(unsub2);
});

test('not passing a function as listener should throw an error', () => {
  const sub = Subscription.create<number>();
  expect(() => {
    sub.subscribe(42 as any);
  }).toThrow();
});

test('on', () => {
  const onFirst = jest.fn();
  const onLast = jest.fn();
  const sub = Subscription.create<number>({
    onFirstSubscription: onFirst,
    onLastUnsubscribe: onLast,
  });
  const cb1 = jest.fn();
  const cb2 = jest.fn();
  sub.subscribe(cb1);
  expect(onFirst).toHaveBeenCalledTimes(1);
  expect(onLast).not.toHaveBeenCalled();
  sub.subscribe(cb2);
  expect(onFirst).toHaveBeenCalledTimes(1);
  expect(onLast).not.toHaveBeenCalled();
  sub.unsubscribe(cb1);
  expect(onFirst).toHaveBeenCalledTimes(1);
  expect(onLast).not.toHaveBeenCalled();
  sub.unsubscribe(cb2);
  expect(onFirst).toHaveBeenCalledTimes(1);
  expect(onLast).toHaveBeenCalledTimes(1);
  sub.subscribe(cb2);
  expect(onFirst).toHaveBeenCalledTimes(2);
  expect(onLast).toHaveBeenCalledTimes(1);
});

test('calling unsubscribeAll inside a cb should stop all the other', () => {
  const sub = Subscription.create<number>();
  const cb1 = jest.fn();
  const cb2 = jest.fn(() => {
    sub.unsubscribeAll();
  });
  const cb3 = jest.fn();
  sub.subscribe(cb1);
  sub.subscribe(cb2);
  sub.subscribe(cb3);
  sub.call(42);
  expect(cb1).toHaveBeenCalledTimes(1);
  expect(cb2).not.toHaveBeenCalled();
  expect(cb3).not.toHaveBeenCalled();
  expect(sub.isSubscribed(cb1)).toBe(false);
  expect(sub.isSubscribed(cb2)).toBe(false);
  expect(sub.isSubscribed(cb3)).toBe(false);
});
