import { Subscription, SubscriptionCallback } from '../dist';

const mySub = Subscription.create<number>();

const onNum: SubscriptionCallback<number> = num => {
  console.log('num: ' + num);
};

mySub.subscribe('my-sub-id', onNum);
mySub.call(45);
mySub.unsubscribe('my-sub-id');
