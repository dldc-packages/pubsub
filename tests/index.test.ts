import { Suub } from '../src/mod';

test('Basic subscription', () => {
  const sub = Suub.createSubscription<number>();
  const cb1 = jest.fn();
  const unsub1 = sub.subscribe(cb1);
  sub.emit(42);
  unsub1();
  sub.emit(3);
  expect(sub.isSubscribed(cb1)).toBe(false);
  expect(cb1).toHaveBeenCalledTimes(1);
  expect(cb1).toHaveBeenCalledWith(42);
});

test('Basic void subscription', () => {
  const sub = Suub.createVoidSubscription();
  const cb1 = jest.fn();
  const unsub1 = sub.subscribe(cb1);
  sub.emit();
  unsub1();
  sub.emit();
  expect(sub.isSubscribed(cb1)).toBe(false);
  expect(cb1).toHaveBeenCalledTimes(1);
  expect(cb1).toHaveBeenCalledWith(undefined);
});

test('Id subscription', () => {
  const sub = Suub.createSubscription<number>();
  const cb1 = jest.fn();
  sub.subscribeById('sub1', cb1);
  sub.emit(42);
  sub.unsubscribeById('sub1');
  sub.emit(3);
  expect(sub.isSubscribed(cb1)).toBe(false);
  expect(cb1).toHaveBeenCalledTimes(1);
  expect(cb1).toHaveBeenCalledWith(42);
});

test('Ref subscription', () => {
  const sub = Suub.createSubscription<number>();
  const cb1 = jest.fn();
  sub.subscribeById('sub1', cb1);
  sub.emit(42);
  sub.unsubscribe(cb1);
  sub.emit(3);
  expect(sub.isSubscribed(cb1)).toBe(false);
  expect(cb1).toHaveBeenCalledTimes(1);
  expect(cb1).toHaveBeenCalledWith(42);
});

test('IsSubscribe subscription', () => {
  const sub = Suub.createSubscription<number>();
  const cb1 = jest.fn();
  sub.subscribe(cb1);
  expect(sub.isSubscribed(cb1)).toBe(true);
});

test('unsub unsubscribed ref does not throw', () => {
  const sub = Suub.createSubscription<number>();
  const cb1 = jest.fn();
  expect(sub.isSubscribed(cb1)).toBe(false);
  expect(() => {
    sub.unsubscribe(cb1);
  }).not.toThrow();
});

test('unsub unsubscribed subId does not throw', () => {
  const sub = Suub.createSubscription<number>();
  expect(sub.isSubscribedById('my-id')).toBe(false);
  expect(() => {
    sub.unsubscribeById('my-id');
  }).not.toThrow();
});

test('Resubscribe the same cb twice should work', () => {
  const sub = Suub.createSubscription<number>();
  const cb1 = jest.fn();
  sub.subscribe(cb1);
  sub.emit(42);
  sub.subscribe(cb1);
  sub.emit(3);
  expect(cb1).toHaveBeenCalledTimes(2);
  expect(cb1).toHaveBeenCalledWith(42);
  expect(cb1).toHaveBeenCalledWith(3);
});

test('Resubscribe the same cb twice should move it to the end', () => {
  const sub = Suub.createSubscription<number>();
  let callCount = 0;
  const cb1 = jest.fn(() => callCount++);
  const cb2 = jest.fn(() => callCount++);
  sub.subscribe(cb1);
  sub.subscribe(cb2);
  sub.emit(42);
  sub.subscribe(cb1);
  sub.emit(3);
  expect(cb1).toHaveBeenCalledTimes(2);
  expect(cb1).toHaveBeenCalledWith(42);
  expect(cb1).toHaveBeenCalledWith(3);
  expect(cb2).toHaveBeenCalledTimes(2);
  expect(cb2).toHaveBeenCalledWith(42);
  expect(cb2).toHaveBeenCalledWith(3);
  // make sure the order is reversed (cb1 is now last)
  expect(cb1).toHaveNthReturnedWith(1, 0);
  expect(cb2).toHaveNthReturnedWith(1, 1);
  expect(cb2).toHaveNthReturnedWith(2, 2);
  expect(cb1).toHaveNthReturnedWith(2, 3);
});

test('Resubscribe the same subId should move it to the end', () => {
  const sub = Suub.createSubscription<number>();
  const cb1 = jest.fn();
  const cb2 = jest.fn();
  sub.subscribeById('sub1', cb1);
  sub.emit(42);
  sub.subscribeById('sub1', cb2);
  sub.emit(3);
  expect(cb1).toHaveBeenCalledTimes(1);
  expect(cb2).toHaveBeenCalledTimes(1);
  expect(cb1).toHaveBeenCalledWith(42);
  expect(cb2).toHaveBeenCalledWith(3);
});

test('Unsub twice with a subId should not throw an error', () => {
  const sub = Suub.createSubscription<number>();
  const cb1 = jest.fn();
  const unsub = sub.subscribeById('sub1', cb1);
  unsub();
  expect(() => {
    unsub();
  }).not.toThrow();
});

test('Unsub twice with a subId using sub.unsubscribe should not throw an error', () => {
  const sub = Suub.createSubscription<number>();
  const cb1 = jest.fn();
  sub.subscribeById('sub1', cb1);
  sub.unsubscribeById('sub1');
  expect(sub.isSubscribedById('sub1')).toBe(false);
  expect(() => {
    sub.unsubscribeById('sub1');
  }).not.toThrow();
});

test('Unsub twice with a cb should not throw an error', () => {
  const sub = Suub.createSubscription<number>();
  const cb1 = jest.fn();
  const unsub = sub.subscribe(cb1);
  unsub();
  expect(() => {
    unsub();
  }).not.toThrow();
});

test('If cb remove a callback not called yet it should not call it', () => {
  const sub = Suub.createSubscription<number>();
  const cb1 = () => {
    sub.unsubscribe(cb2);
  };
  const cb2 = jest.fn();
  sub.subscribe(cb1);
  sub.subscribe(cb2);
  sub.emit(42);
  expect(cb2).not.toHaveBeenCalled();
});

test('If a cb remove a callback by subId not called yet it should not call it', () => {
  const sub = Suub.createSubscription<number>();
  const cb1 = () => {
    sub.unsubscribeById('sub2');
  };
  const cb2 = jest.fn();
  sub.subscribe(cb1);
  sub.subscribeById('sub2', cb2);
  sub.emit(42);
  expect(cb2).not.toHaveBeenCalled();
  expect(sub.isSubscribedById('sub2')).toBe(false);
});

test('If cb remove a callback already called it should not skip cb', () => {
  const sub = Suub.createSubscription<number>();
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
  sub.emit(42);
  expect(cb1).toHaveBeenCalledTimes(1);
  expect(cb2).toHaveBeenCalledTimes(1);
  expect(cb3).toHaveBeenCalledTimes(1);
  expect(cb4).toHaveBeenCalledTimes(1);
});

test('adding a callback in a cb should not call it until the next call()', () => {
  const sub = Suub.createSubscription<number>();
  const cb1 = jest.fn();
  const cb2 = jest.fn(() => {
    sub.subscribe(cb3);
  });
  const cb3 = jest.fn();
  sub.subscribe(cb1);
  sub.subscribe(cb2);
  sub.emit(42);
  expect(cb1).toHaveBeenCalledTimes(1);
  expect(cb2).toHaveBeenCalledTimes(1);
  expect(cb3).not.toHaveBeenCalled();
  sub.emit(3);
  expect(cb1).toHaveBeenCalledTimes(2);
  expect(cb2).toHaveBeenCalledTimes(2);
  expect(cb3).toHaveBeenCalledTimes(1);
});

test('calling unsubscribeAll should work', () => {
  const sub = Suub.createSubscription<number>();
  const cb1 = jest.fn();
  const cb2 = jest.fn();
  const cb3 = jest.fn();
  sub.subscribe(cb1);
  sub.subscribe(cb2);
  sub.subscribe(cb3);
  sub.emit(42);
  expect(cb1).toHaveBeenCalledTimes(1);
  expect(cb2).toHaveBeenCalledTimes(1);
  expect(cb3).toHaveBeenCalledTimes(1);
  sub.unsubscribeAll();
  expect(cb1).toHaveBeenCalledTimes(1);
  expect(cb2).toHaveBeenCalledTimes(1);
  expect(cb3).toHaveBeenCalledTimes(1);
});

test('subscribing twice the same callback with subId should return the same unsub', () => {
  const sub = Suub.createSubscription<number>();
  const cb1 = jest.fn();
  const unsub1 = sub.subscribeById('sub', cb1);
  const unsub2 = sub.subscribeById('sub', cb1);
  expect(unsub1).toBe(unsub2);
});

test('not passing a function as callback should throw an error', () => {
  const sub = Suub.createSubscription<number>();
  expect(() => {
    sub.subscribe(42 as any);
  }).toThrow();
});

test('onFirstSubscription and onLastUnsubscribe', () => {
  const onFirst = jest.fn();
  const onLast = jest.fn();
  const sub = Suub.createSubscription<number>({
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
  const sub = Suub.createSubscription<number>();
  const cb1 = jest.fn(() => {
    sub.unsubscribeAll();
  });
  const cb2 = jest.fn();
  const cb3 = jest.fn();
  sub.subscribe(cb1);
  sub.subscribe(cb2);
  sub.subscribe(cb3);
  sub.emit(42);
  expect(cb1).toHaveBeenCalledTimes(1);
  expect(cb2).not.toHaveBeenCalled();
  expect(cb3).not.toHaveBeenCalled();
  expect(sub.isSubscribed(cb1)).toBe(false);
  expect(sub.isSubscribed(cb2)).toBe(false);
  expect(sub.isSubscribed(cb3)).toBe(false);
});

test('Calling call in a callback should throw because of inifnite loop', () => {
  const sub = Suub.createSubscription<number>();
  let val = 0;
  const cb1 = jest.fn(() => {
    sub.emit(val++);
  });
  sub.subscribe(cb1);
  expect(() => sub.emit(val++)).toThrow(/maxRecursiveEmit/);
});

test('maxRecursiveEmit', () => {
  const sub = Suub.createSubscription<number>({ maxRecursiveEmit: 10 });
  const cb1 = jest.fn((val) => {
    if (val > 0) {
      sub.emit(val - 1);
    }
  });
  sub.subscribe(cb1);
  expect(() => sub.emit(9)).not.toThrow();
  expect(() => sub.emit(10)).toThrow(/maxRecursiveEmit/);
});

test('maxSubscriptionCount limit the number of subscriptions', () => {
  const sub = Suub.createVoidSubscription({ maxSubscriptionCount: 5 });
  sub.subscribe(() => {});
  sub.subscribe(() => {});
  sub.subscribe(() => {});
  sub.subscribe(() => {});
  sub.subscribe(() => {});
  sub.subscribe(() => {});
  expect(() => sub.emit()).toThrow(/maxSubscriptionCount/);
});

test('Calling call conditinally in a callback should defer the call', () => {
  const sub = Suub.createSubscription<number>();
  let count = 0;
  const cb1 = jest.fn((val) => {
    if (val === 0) {
      sub.emit(1);
    }
    return count++;
  });
  const cb2 = jest.fn(() => count++);
  sub.subscribe(cb1);
  sub.subscribe(cb2);
  sub.emit(0);
  expect(cb1).toHaveBeenCalledTimes(2);
  expect(cb1).toHaveBeenCalledWith(0);
  expect(cb1).toHaveBeenCalledWith(1);
  expect(cb2).toHaveBeenCalledTimes(2);
  expect(cb2).toHaveBeenCalledWith(0);
  expect(cb2).toHaveBeenCalledWith(1);
  // make sure the order is correct (cb1 is now last)
  expect(cb1).toHaveNthReturnedWith(1, 0);
  expect(cb2).toHaveNthReturnedWith(1, 1);
  expect(cb1).toHaveNthReturnedWith(2, 2);
  expect(cb2).toHaveNthReturnedWith(2, 3);
});

test('Sub.size() returns the number of subscriptions', () => {
  const sub = Suub.createSubscription<number>();
  expect(sub.size()).toBe(0);
  const unsub1 = sub.subscribe(() => {});
  expect(sub.size()).toBe(1);
  unsub1();
  expect(sub.size()).toBe(0);
  const unsub2 = sub.subscribe(() => {});
  sub.subscribe(() => {});
  expect(sub.size()).toBe(2);
  unsub2();
  expect(sub.size()).toBe(1);
  sub.subscribe(() => {});
  sub.subscribe(() => {});
  sub.subscribe(() => {});
  expect(sub.size()).toBe(4);
  sub.unsubscribeAll();
  expect(sub.size()).toBe(0);
});

test('OnUnsubscribe is called when unsubscribe is called', () => {
  const sub = Suub.createSubscription<number>();
  const onUnsub = jest.fn();
  const unsub = sub.subscribe(() => {}, onUnsub);
  expect(onUnsub).not.toHaveBeenCalled();
  unsub();
  expect(onUnsub).toHaveBeenCalledTimes(1);
  unsub();
  expect(onUnsub).toHaveBeenCalledTimes(1);
});

test('OnUnsubscribe is called when sub.unsubscribe is called', () => {
  const sub = Suub.createSubscription<number>();
  const onUnsub = jest.fn();
  const cb = () => {};
  sub.subscribe(cb, onUnsub);
  expect(onUnsub).not.toHaveBeenCalled();
  sub.unsubscribe(cb);
  expect(onUnsub).toHaveBeenCalledTimes(1);
});

test('OnUnsubscribe is called when sub.unsubscribeAll is called', () => {
  const sub = Suub.createSubscription<number>();
  const onUnsub = jest.fn();
  sub.subscribe(() => {}, onUnsub);
  expect(onUnsub).not.toHaveBeenCalled();
  sub.unsubscribeAll();
  expect(onUnsub).toHaveBeenCalledTimes(1);
});

test('Resubscribing with different onUnsub should update the onUnsub', () => {
  const sub = Suub.createSubscription<number>();
  const onUnsub1 = jest.fn();
  const onUnsub2 = jest.fn();
  const cb = () => {};
  sub.subscribe(cb, onUnsub1);
  sub.subscribe(cb, onUnsub2);
  expect(onUnsub1).not.toHaveBeenCalled();
  expect(onUnsub2).not.toHaveBeenCalled();
  sub.unsubscribeAll();
  // expect(onUnsub1).not.toHaveBeenCalled();
  expect(onUnsub2).toHaveBeenCalledTimes(1);
});

test('Cannot subscribe or emit once destroyed', () => {
  const sub = Suub.createSubscription<number>();
  sub.destroy();
  expect(() => sub.isDestroyed()).toBeTruthy();
  expect(() => sub.emit(42)).toThrow(/destroyed/);
  expect(() => sub.subscribe(() => {})).toThrow(/destroyed/);
});

test('Destroy twice should not throw', () => {
  const sub = Suub.createSubscription<number>();
  sub.destroy();
  expect(() => sub.destroy()).not.toThrow();
});

test('onDestroy is called when destroy is called', () => {
  const onDestroy = jest.fn();
  const sub = Suub.createSubscription<number>({ onDestroy });
  expect(onDestroy).not.toHaveBeenCalled();
  sub.destroy();
  expect(onDestroy).toHaveBeenCalledTimes(1);
  sub.destroy();
  expect(onDestroy).toHaveBeenCalledTimes(1);
  expect(sub.isDestroyed()).toBe(true);
});

test('resubscribing subid should update the callback', () => {
  const sub = Suub.createSubscription<number>();
  const cb1 = jest.fn();
  const cb2 = jest.fn();
  const subid = 'subid';
  sub.subscribeById(subid, cb1);
  sub.emit(42);
  expect(cb1).toHaveBeenCalledTimes(1);
  expect(cb1).toHaveBeenCalledWith(42);
  expect(cb2).not.toHaveBeenCalled();
  sub.subscribeById(subid, cb2);
  sub.emit(21);
  expect(cb1).toHaveBeenCalledTimes(1);
  expect(cb2).toHaveBeenCalledTimes(1);
  expect(cb2).toHaveBeenCalledWith(21);
});

describe('resubscribing last subscription should not trigger onLastUnsubscribe', () => {
  test('with id subscription', () => {
    const onLastUnsubscribe = jest.fn();
    const sub = Suub.createSubscription<number>({
      onLastUnsubscribe,
    });
    const cb1 = jest.fn();
    sub.subscribeById('subid1', cb1);
    expect(onLastUnsubscribe).not.toHaveBeenCalled();
    sub.subscribeById('subid2', cb1);
    expect(onLastUnsubscribe).not.toHaveBeenCalled();
  });

  test('with callback subscription', () => {
    const onLastUnsubscribe = jest.fn();
    const sub = Suub.createSubscription<number>({
      onLastUnsubscribe,
    });
    const cb1 = jest.fn();
    sub.subscribe(cb1);
    expect(onLastUnsubscribe).not.toHaveBeenCalled();
    sub.subscribe(cb1);
    expect(onLastUnsubscribe).not.toHaveBeenCalled();
  });
});

test('Basic channel', () => {
  const sub = Suub.createSubscription<number>();

  const chan1 = sub.channel('chan1');
  const chan2 = sub.channel('chan2');

  const cb1 = jest.fn();
  const cb2 = jest.fn();

  chan1.subscribe(cb1);
  chan2.subscribe(cb2);

  chan1.emit(42);
  expect(cb1).toHaveBeenCalledTimes(1);
  expect(cb1).toHaveBeenCalledWith(42);
  expect(cb2).not.toHaveBeenCalled();

  chan2.emit(21);
  expect(cb1).toHaveBeenCalledTimes(1);
  expect(cb2).toHaveBeenCalledTimes(1);
  expect(cb2).toHaveBeenCalledWith(21);
});

test('Create channel with same value', () => {
  const sub = Suub.createSubscription<number>();

  const chan1 = sub.channel('chan1');
  const chan2 = sub.channel('chan2');
  const chan1bis = sub.channel('chan1');

  const cb1 = jest.fn();
  const cb2 = jest.fn();
  const cb1bis = jest.fn();

  chan1.subscribe(cb1);
  chan2.subscribe(cb2);
  chan1bis.subscribe(cb1bis);

  chan1.emit(42);
  expect(cb1).toHaveBeenCalledTimes(1);
  expect(cb1).toHaveBeenCalledWith(42);
  expect(cb2).not.toHaveBeenCalled();
  expect(cb1bis).toHaveBeenCalledTimes(1);
  expect(cb1bis).toHaveBeenCalledWith(42);

  chan2.emit(21);
  expect(cb1).toHaveBeenCalledTimes(1);
  expect(cb2).toHaveBeenCalledTimes(1);
  expect(cb2).toHaveBeenCalledWith(21);
});

test('Unsub all from channel', () => {
  const sub = Suub.createSubscription<number>();

  const chan1 = sub.channel('chan1');
  const chan2 = sub.channel('chan2');

  const cb1a = jest.fn();
  const cb1b = jest.fn();
  const cb2 = jest.fn();

  chan1.subscribe(cb1a);
  chan1.subscribe(cb1b);
  chan2.subscribe(cb2);

  chan1.emit(42);
  expect(cb1a).toHaveBeenCalledTimes(1);
  expect(cb1a).toHaveBeenCalledWith(42);
  expect(cb1b).toHaveBeenCalledTimes(1);
  expect(cb1b).toHaveBeenCalledWith(42);
  expect(cb2).not.toHaveBeenCalled();

  chan1.unsubscribeAll();
  chan1.emit(21);
  expect(cb1a).toHaveBeenCalledTimes(1);
  expect(cb1b).toHaveBeenCalledTimes(1);
  expect(chan1.isSubscribed(cb1a)).toBe(false);
  expect(chan1.isSubscribed(cb1b)).toBe(false);
});

test('Subscribe in onUnsubscribe should also unsubscribe', () => {
  const sub = Suub.createSubscription<number>();

  const cb2 = jest.fn();
  const cb1 = jest.fn();

  const unsubCb1 = jest.fn(() => sub.subscribe(cb2, unsubCb2));
  const unsubCb2 = jest.fn();

  sub.subscribe(cb1, unsubCb1);

  sub.unsubscribeAll();
  expect(unsubCb1).toHaveBeenCalledTimes(1);
  expect(unsubCb2).toHaveBeenCalledTimes(1);

  expect(sub.size()).toBe(0);
  expect(sub.isSubscribed(cb2)).toBe(false);
});

test('Subscribe in onUnsubscribe + unsubscribeAll', () => {
  const sub = Suub.createSubscription<number>();

  const cb2 = jest.fn();
  const cb1 = jest.fn();
  const unsubCb2 = jest.fn();

  const unsubCb1 = jest.fn(() => {
    sub.subscribe(cb2, unsubCb2);
  });

  sub.subscribe(cb1, unsubCb1);

  sub.emit(42);
  expect(cb1).toHaveBeenCalledTimes(1);

  sub.unsubscribeAll();
  expect(unsubCb1).toHaveBeenCalledTimes(1);
  expect(unsubCb2).toHaveBeenCalledTimes(1);
});

test('Subscribe in onUnsubscribe loop should throw', () => {
  const sub = Suub.createSubscription<number>();

  const cb1 = jest.fn();
  const unsubCb1 = jest.fn(() => {
    sub.subscribe(cb1, unsubCb1);
  });

  sub.subscribe(cb1, unsubCb1);

  sub.emit(42);
  expect(cb1).toHaveBeenCalledTimes(1);

  expect(() => sub.unsubscribeAll()).toThrow();
});

test('Subscribe in onUnsubscribe multi loop should throw', () => {
  const sub = Suub.createSubscription<number>();

  const cb1 = jest.fn();
  const cb2 = jest.fn();
  const cb3 = jest.fn();

  const unsubCb1 = () => {
    sub.subscribe(cb2, unsubCb2);
  };
  const unsubCb2 = () => {
    sub.subscribe(cb3, unsubCb3);
  };
  const unsubCb3 = () => {
    sub.subscribe(cb1, unsubCb1);
  };

  sub.subscribe(cb1, unsubCb1);

  expect(() => sub.unsubscribeAll()).toThrow();
});
