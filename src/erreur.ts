import { createErreurStore, type TErreurStore } from "@dldc/erreur";

export type TPubSubErreurData =
  | { kind: "SubscriptionDestroyed" }
  | { kind: "MaxSubscriptionCountReached" }
  | { kind: "MaxRecursiveEmitReached"; limit: number }
  | { kind: "MaxUnsubscribeAllLoopReached"; limit: number }
  | { kind: "InvalidCallback" };

const PubSubErreurInternal: TErreurStore<TPubSubErreurData> = createErreurStore<
  TPubSubErreurData
>();

export const PubSubErreur = PubSubErreurInternal.asReadonly;

export function throwSubscriptionDestroyed() {
  return PubSubErreurInternal.setAndThrow(
    "The subscription has been destroyed",
    { kind: "SubscriptionDestroyed" },
  );
}

export function throwMaxSubscriptionCountReached() {
  return PubSubErreurInternal.setAndThrow(
    `The maxSubscriptionCount has been reached. If this is expected you can use the maxSubscriptionCount option to raise the limit`,
    { kind: "MaxSubscriptionCountReached" },
  );
}

export function throwMaxRecursiveEmitReached(limit: number) {
  return PubSubErreurInternal.setAndThrow(
    `The maxRecursiveEmit limit (${limit}) has been reached, did you emit() in a callback ? If this is expected you can use the maxRecursiveEmit option to raise the limit`,
    { kind: "MaxRecursiveEmitReached", limit },
  );
}

export function throwMaxUnsubscribeAllLoopReached(limit: number) {
  return PubSubErreurInternal.setAndThrow(
    `The maxUnsubscribeAllLoop limit (${limit}) has been reached, did you call subscribe() in the onUnsubscribe callback then called unsubscribeAll ? If this is expected you can use the maxUnsubscribeAllLoop option to raise the limit`,
    { kind: "MaxUnsubscribeAllLoopReached", limit },
  );
}

export function throwInvalidCallback() {
  return PubSubErreurInternal.setAndThrow("The callback is not a function", {
    kind: "InvalidCallback",
  });
}
