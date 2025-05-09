import { expect, fn } from "@std/expect";
import {
  createScheduler,
  createSubscription,
  createVoidSubscription,
  type TSubscriptionCallback,
  type VoidSubscriptionCallback,
} from "../mod.ts";

Deno.test("Basic subscription", () => {
  const sub = createSubscription<number>();
  const cb1 = fn() as TSubscriptionCallback<number>;
  const unsub1 = sub.subscribe(cb1);
  sub.emit(42);
  unsub1();
  sub.emit(3);
  expect(sub.isSubscribed(cb1)).toBe(false);
  expect(cb1).toHaveBeenCalledTimes(1);
  expect(cb1).toHaveBeenCalledWith(42);
});

Deno.test("Basic void subscription", () => {
  const sub = createVoidSubscription();
  const cb1 = fn() as VoidSubscriptionCallback;
  const unsub1 = sub.subscribe(cb1);
  sub.emit();
  unsub1();
  sub.emit();
  expect(sub.isSubscribed(cb1)).toBe(false);
  expect(cb1).toHaveBeenCalledTimes(1);
  expect(cb1).toHaveBeenCalledWith(undefined);
});

Deno.test("Id subscription", () => {
  const sub = createSubscription<number>();
  const cb1 = fn() as TSubscriptionCallback<number>;
  sub.subscribeById("sub1", cb1);
  sub.emit(42);
  sub.unsubscribeById("sub1");
  sub.emit(3);
  expect(sub.isSubscribed(cb1)).toBe(false);
  expect(cb1).toHaveBeenCalledTimes(1);
  expect(cb1).toHaveBeenCalledWith(42);
});

Deno.test("Ref subscription", () => {
  const sub = createSubscription<number>();
  const cb1 = fn() as TSubscriptionCallback<number>;
  sub.subscribeById("sub1", cb1);
  sub.emit(42);
  sub.unsubscribe(cb1);
  sub.emit(3);
  expect(sub.isSubscribed(cb1)).toBe(false);
  expect(cb1).toHaveBeenCalledTimes(1);
  expect(cb1).toHaveBeenCalledWith(42);
});

Deno.test("IsSubscribe subscription", () => {
  const sub = createSubscription<number>();
  const cb1 = fn() as TSubscriptionCallback<number>;
  sub.subscribe(cb1);
  expect(sub.isSubscribed(cb1)).toBe(true);
});

Deno.test("unsub unsubscribed ref does not throw", () => {
  const sub = createSubscription<number>();
  const cb1 = fn() as TSubscriptionCallback<number>;
  expect(sub.isSubscribed(cb1)).toBe(false);
  expect(() => {
    sub.unsubscribe(cb1);
  }).not.toThrow();
});

Deno.test("unsub unsubscribed subId does not throw", () => {
  const sub = createSubscription<number>();
  expect(sub.isSubscribedById("my-id")).toBe(false);
  expect(() => {
    sub.unsubscribeById("my-id");
  }).not.toThrow();
});

Deno.test("Resubscribe the same cb twice should work", () => {
  const sub = createSubscription<number>();
  const cb1 = fn() as TSubscriptionCallback<number>;
  sub.subscribe(cb1);
  sub.emit(42);
  sub.subscribe(cb1);
  sub.emit(3);
  expect(cb1).toHaveBeenCalledTimes(2);
  expect(cb1).toHaveBeenCalledWith(42);
  expect(cb1).toHaveBeenCalledWith(3);
});

Deno.test("Resubscribe the same cb twice should move it to the end", () => {
  const sub = createSubscription<number>();
  let callCount = 0;
  const cb1 = fn(() => callCount++) as TSubscriptionCallback<number>;
  const cb2 = fn(() => callCount++) as TSubscriptionCallback<number>;
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

Deno.test("Resubscribe the same subId should move it to the end", () => {
  const sub = createSubscription<number>();
  const cb1 = fn() as TSubscriptionCallback<number>;
  const cb2 = fn() as TSubscriptionCallback<number>;
  sub.subscribeById("sub1", cb1);
  sub.emit(42);
  sub.subscribeById("sub1", cb2);
  sub.emit(3);
  expect(cb1).toHaveBeenCalledTimes(1);
  expect(cb2).toHaveBeenCalledTimes(1);
  expect(cb1).toHaveBeenCalledWith(42);
  expect(cb2).toHaveBeenCalledWith(3);
});

Deno.test("Unsub twice with a subId should not throw an error", () => {
  const sub = createSubscription<number>();
  const cb1 = fn() as TSubscriptionCallback<number>;
  const unsub = sub.subscribeById("sub1", cb1);
  unsub();
  expect(() => {
    unsub();
  }).not.toThrow();
});

Deno.test(
  "Unsub twice with a subId using sub.unsubscribe should not throw an error",
  () => {
    const sub = createSubscription<number>();
    const cb1 = fn() as TSubscriptionCallback<number>;
    sub.subscribeById("sub1", cb1);
    sub.unsubscribeById("sub1");
    expect(sub.isSubscribedById("sub1")).toBe(false);
    expect(() => {
      sub.unsubscribeById("sub1");
    }).not.toThrow();
  },
);

Deno.test("Unsub twice with a cb should not throw an error", () => {
  const sub = createSubscription<number>();
  const cb1 = fn() as TSubscriptionCallback<number>;
  const unsub = sub.subscribe(cb1);
  unsub();
  expect(() => {
    unsub();
  }).not.toThrow();
});

Deno.test(
  "If cb remove a callback not called yet it should not call it",
  () => {
    const sub = createSubscription<number>();
    const cb1 = () => {
      sub.unsubscribe(cb2);
    };
    const cb2 = fn() as TSubscriptionCallback<number>;
    sub.subscribe(cb1);
    sub.subscribe(cb2);
    sub.emit(42);
    expect(cb2).not.toHaveBeenCalled();
  },
);

Deno.test(
  "If a cb remove a callback by subId not called yet it should not call it",
  () => {
    const sub = createSubscription<number>();
    const cb1 = () => {
      sub.unsubscribeById("sub2");
    };
    const cb2 = fn() as TSubscriptionCallback<number>;
    sub.subscribe(cb1);
    sub.subscribeById("sub2", cb2);
    sub.emit(42);
    expect(cb2).not.toHaveBeenCalled();
    expect(sub.isSubscribedById("sub2")).toBe(false);
  },
);

Deno.test(
  "If cb remove a callback already called it should not skip cb",
  () => {
    const sub = createSubscription<number>();
    const cb1 = fn() as TSubscriptionCallback<number>;
    const cb2 = fn(() => {
      sub.unsubscribe(cb1);
    }) as TSubscriptionCallback<number>;
    const cb3 = fn() as TSubscriptionCallback<number>;
    const cb4 = fn() as TSubscriptionCallback<number>;
    sub.subscribe(cb1);
    sub.subscribe(cb2);
    sub.subscribe(cb3);
    sub.subscribe(cb4);
    sub.emit(42);
    expect(cb1).toHaveBeenCalledTimes(1);
    expect(cb2).toHaveBeenCalledTimes(1);
    expect(cb3).toHaveBeenCalledTimes(1);
    expect(cb4).toHaveBeenCalledTimes(1);
  },
);

Deno.test(
  "adding a callback in a cb should not call it until the next call()",
  () => {
    const sub = createSubscription<number>();
    const cb1 = fn() as TSubscriptionCallback<number>;
    const cb2 = fn(() => {
      sub.subscribe(cb3);
    }) as TSubscriptionCallback<number>;
    const cb3 = fn() as TSubscriptionCallback<number>;
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
  },
);

Deno.test("calling unsubscribeAll should work", () => {
  const sub = createSubscription<number>();
  const cb1 = fn() as TSubscriptionCallback<number>;
  const cb2 = fn() as TSubscriptionCallback<number>;
  const cb3 = fn() as TSubscriptionCallback<number>;
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

Deno.test(
  "subscribing twice the same callback with subId should return the same unsub",
  () => {
    const sub = createSubscription<number>();
    const cb1 = fn() as TSubscriptionCallback<number>;
    const unsub1 = sub.subscribeById("sub", cb1);
    const unsub2 = sub.subscribeById("sub", cb1);
    expect(unsub1).toBe(unsub2);
  },
);

Deno.test("not passing a function as callback should throw an error", () => {
  const sub = createSubscription<number>();
  expect(() => {
    // deno-lint-ignore no-explicit-any
    sub.subscribe(42 as any);
  }).toThrow();
});

Deno.test("onFirstSubscription and onLastUnsubscribe", () => {
  const onFirst = fn() as () => void;
  const onLast = fn() as () => void;
  const sub = createSubscription<number>({
    onFirstSubscription: onFirst,
    onLastUnsubscribe: onLast,
  });
  const cb1 = fn() as TSubscriptionCallback<number>;
  const cb2 = fn() as TSubscriptionCallback<number>;
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

Deno.test(
  "calling unsubscribeAll inside a cb should stop all the other",
  () => {
    const sub = createSubscription<number>();
    const cb1 = fn(() => {
      sub.unsubscribeAll();
    }) as TSubscriptionCallback<number>;
    const cb2 = fn() as TSubscriptionCallback<number>;
    const cb3 = fn() as TSubscriptionCallback<number>;
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
  },
);

Deno.test(
  "Calling call in a callback should throw because of inifnite loop",
  () => {
    const sub = createSubscription<number>();
    let val = 0;
    const cb1 = fn(() => {
      sub.emit(val++);
    }) as TSubscriptionCallback<number>;
    sub.subscribe(cb1);
    expect(() => sub.emit(val++)).toThrow(/maxRecursiveEmit/);
  },
);

Deno.test("maxRecursiveEmit", () => {
  const sub = createSubscription<number>({ maxRecursiveEmit: 10 });
  const cb1 = fn((val: number) => {
    if (val > 0) {
      sub.emit(val - 1);
    }
  }) as TSubscriptionCallback<number>;
  sub.subscribe(cb1);
  expect(() => sub.emit(9)).not.toThrow();
  expect(() => sub.emit(10)).toThrow(/maxRecursiveEmit/);
});

Deno.test("maxSubscriptionCount limit the number of subscriptions", () => {
  const sub = createVoidSubscription({ maxSubscriptionCount: 5 });
  sub.subscribe(() => {});
  sub.subscribe(() => {});
  sub.subscribe(() => {});
  sub.subscribe(() => {});
  sub.subscribe(() => {});
  sub.subscribe(() => {});
  expect(() => sub.emit()).toThrow(/maxSubscriptionCount/);
});

Deno.test(
  "Calling call conditinally in a callback should defer the call",
  () => {
    const sub = createSubscription<number>();
    let count = 0;
    const cb1 = fn((val: number) => {
      if (val === 0) {
        sub.emit(1);
      }
      return count++;
    }) as TSubscriptionCallback<number>;
    const cb2 = fn(() => count++) as TSubscriptionCallback<number>;
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
  },
);

Deno.test("Sub.size() returns the number of subscriptions", () => {
  const sub = createSubscription<number>();
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

Deno.test("OnUnsubscribe is called when unsubscribe is called", () => {
  const sub = createSubscription<number>();
  const onUnsub = fn() as () => void;
  const unsub = sub.subscribe(() => {}, onUnsub);
  expect(onUnsub).not.toHaveBeenCalled();
  unsub();
  expect(onUnsub).toHaveBeenCalledTimes(1);
  unsub();
  expect(onUnsub).toHaveBeenCalledTimes(1);
});

Deno.test("OnUnsubscribe is called when sub.unsubscribe is called", () => {
  const sub = createSubscription<number>();
  const onUnsub = fn() as () => void;
  const cb = () => {};
  sub.subscribe(cb, onUnsub);
  expect(onUnsub).not.toHaveBeenCalled();
  sub.unsubscribe(cb);
  expect(onUnsub).toHaveBeenCalledTimes(1);
});

Deno.test("OnUnsubscribe is called when sub.unsubscribeAll is called", () => {
  const sub = createSubscription<number>();
  const onUnsub = fn() as () => void;
  sub.subscribe(() => {}, onUnsub);
  expect(onUnsub).not.toHaveBeenCalled();
  sub.unsubscribeAll();
  expect(onUnsub).toHaveBeenCalledTimes(1);
});

Deno.test(
  "Resubscribing with different onUnsub should update the onUnsub",
  () => {
    const sub = createSubscription<number>();
    const onUnsub1 = fn() as () => void;
    const onUnsub2 = fn() as () => void;
    const cb = () => {};
    sub.subscribe(cb, onUnsub1);
    sub.subscribe(cb, onUnsub2);
    expect(onUnsub1).not.toHaveBeenCalled();
    expect(onUnsub2).not.toHaveBeenCalled();
    sub.unsubscribeAll();
    // expect(onUnsub1).not.toHaveBeenCalled();
    expect(onUnsub2).toHaveBeenCalledTimes(1);
  },
);

Deno.test("Cannot subscribe or emit once destroyed", () => {
  const sub = createSubscription<number>();
  sub.destroy();
  expect(() => sub.isDestroyed()).toBeTruthy();
  expect(() => sub.emit(42)).toThrow(/destroyed/);
  expect(() => sub.subscribe(() => {})).toThrow(/destroyed/);
});

Deno.test("Destroy twice should not throw", () => {
  const sub = createSubscription<number>();
  sub.destroy();
  expect(() => sub.destroy()).not.toThrow();
});

Deno.test("onDestroy is called when destroy is called", () => {
  const onDestroy = fn() as () => void;
  const sub = createSubscription<number>({ onDestroy });
  expect(onDestroy).not.toHaveBeenCalled();
  sub.destroy();
  expect(onDestroy).toHaveBeenCalledTimes(1);
  sub.destroy();
  expect(onDestroy).toHaveBeenCalledTimes(1);
  expect(sub.isDestroyed()).toBe(true);
});

Deno.test("resubscribing subid should update the callback", () => {
  const sub = createSubscription<number>();
  const cb1 = fn() as TSubscriptionCallback<number>;
  const cb2 = fn() as TSubscriptionCallback<number>;
  const subid = "subid";
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

Deno.test(
  "resubscribing last subscription should not trigger onLastUnsubscribe > with id subscription",
  () => {
    const onLastUnsubscribe = fn() as () => void;
    const sub = createSubscription<number>({
      onLastUnsubscribe,
    });
    const cb1 = fn() as TSubscriptionCallback<number>;
    sub.subscribeById("subid1", cb1);
    expect(onLastUnsubscribe).not.toHaveBeenCalled();
    sub.subscribeById("subid2", cb1);
    expect(onLastUnsubscribe).not.toHaveBeenCalled();
  },
);

Deno.test(
  "resubscribing last subscription should not trigger onLastUnsubscribe > with callback subscription",
  () => {
    const onLastUnsubscribe = fn() as () => void;
    const sub = createSubscription<number>({
      onLastUnsubscribe,
    });
    const cb1 = fn() as TSubscriptionCallback<number>;
    sub.subscribe(cb1);
    expect(onLastUnsubscribe).not.toHaveBeenCalled();
    sub.subscribe(cb1);
    expect(onLastUnsubscribe).not.toHaveBeenCalled();
  },
);

Deno.test("Basic scheduler usage", () => {
  const scheduler = createScheduler();
  const chan1 = createSubscription<number>(scheduler);
  const chan2 = createSubscription<number>(scheduler);

  const cb1 = fn() as TSubscriptionCallback<number>;
  const cb2 = fn() as TSubscriptionCallback<number>;

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

Deno.test("Unsub all with scheduler", () => {
  const scheduler = createScheduler();
  const chan1 = createSubscription<number>(scheduler);
  const chan2 = createSubscription<number>(scheduler);

  const cb1a = fn() as TSubscriptionCallback<number>;
  const cb1b = fn() as TSubscriptionCallback<number>;
  const cb2 = fn() as TSubscriptionCallback<number>;

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

Deno.test("Subscribe in onUnsubscribe should also unsubscribe", () => {
  const sub = createSubscription<number>();

  const cb2 = fn() as TSubscriptionCallback<number>;
  const cb1 = fn() as TSubscriptionCallback<number>;

  const unsubCb1 = fn(() => sub.subscribe(cb2, unsubCb2)) as () => void;
  const unsubCb2 = fn() as () => void;

  sub.subscribe(cb1, unsubCb1);

  sub.unsubscribeAll();
  expect(unsubCb1).toHaveBeenCalledTimes(1);
  expect(unsubCb2).toHaveBeenCalledTimes(1);

  expect(sub.size()).toBe(0);
  expect(sub.isSubscribed(cb2)).toBe(false);
});

Deno.test("Subscribe in onUnsubscribe + unsubscribeAll", () => {
  const sub = createSubscription<number>();

  const cb2 = fn() as TSubscriptionCallback<number>;
  const cb1 = fn() as TSubscriptionCallback<number>;
  const unsubCb2 = fn() as () => void;

  const unsubCb1 = fn(() => {
    sub.subscribe(cb2, unsubCb2);
  }) as () => void;

  sub.subscribe(cb1, unsubCb1);

  sub.emit(42);
  expect(cb1).toHaveBeenCalledTimes(1);

  sub.unsubscribeAll();
  expect(unsubCb1).toHaveBeenCalledTimes(1);
  expect(unsubCb2).toHaveBeenCalledTimes(1);
});

Deno.test("Subscribe in onUnsubscribe loop should throw", () => {
  const sub = createSubscription<number>();

  const cb1 = fn() as TSubscriptionCallback<number>;
  const unsubCb1 = fn(() => {
    sub.subscribe(cb1, unsubCb1);
  }) as () => void;

  sub.subscribe(cb1, unsubCb1);

  sub.emit(42);
  expect(cb1).toHaveBeenCalledTimes(1);

  expect(() => sub.unsubscribeAll()).toThrow();
});

Deno.test("Subscribe in onUnsubscribe multi loop should throw", () => {
  const sub = createSubscription<number>();

  const cb1 = fn() as TSubscriptionCallback<number>;
  const cb2 = fn() as TSubscriptionCallback<number>;
  const cb3 = fn() as TSubscriptionCallback<number>;

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

Deno.test("Emit in subscribe is deferred", () => {
  const scheduler = createScheduler();
  const chan1 = createVoidSubscription(scheduler);
  const chan2 = createVoidSubscription(scheduler);

  const cb2 = fn(() => {
    chan1.emit();
  }) as VoidSubscriptionCallback;

  chan2.subscribe(cb2);

  let emited = false;

  const cb1 = fn(() => {
    if (!emited) {
      chan2.emit();
      emited = true;
    }
  }) as VoidSubscriptionCallback;

  chan1.subscribe(cb1);

  chan1.emit();

  expect(cb1).toHaveBeenCalledTimes(2);
  expect(cb2).toHaveBeenCalledTimes(1);
});

Deno.test("Emit without batch", () => {
  const sub = createSubscription<number>();

  const cb1 = fn() as TSubscriptionCallback<number>;
  sub.subscribe(cb1);

  sub.emit(42);
  expect(cb1).toHaveBeenCalledTimes(1);
  sub.emit(1);

  expect(cb1).toHaveBeenCalledTimes(2);
});

Deno.test("Can emit in batch", () => {
  const sub = createSubscription<number>();

  const cb1 = fn() as TSubscriptionCallback<number>;
  sub.subscribe(cb1);

  sub.batch(() => {
    sub.emit(42);
    expect(cb1).not.toHaveBeenCalled();
    sub.emit(1);
  });

  expect(cb1).toHaveBeenCalledTimes(2);
});
