import { Subscription, SubscriptionCallback } from '../dist';

const mySub = Subscription.create<number>();

const onNum: SubscriptionCallback<number> = num => {
  console.log('num: ' + num);
};

mySub.subscribe(onNum);
mySub.call(45);
mySub.unsubscribe(onNum);
