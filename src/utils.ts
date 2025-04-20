import { IS_SCHEDULER, IS_SUBSCRIPTION } from "./internal.ts";
import type { TScheduler } from "./scheduler.ts";
import type { TSubscription } from "./subscription.ts";

export function isScheduler(scheduler: any): scheduler is TScheduler {
  return scheduler[IS_SCHEDULER] === true;
}

export function isSubscription(
  subscription: any,
): subscription is TSubscription<any> {
  return subscription[IS_SUBSCRIPTION] === true;
}
