import { Subscription } from '../dist';

const mySub = Subscription.create<number>();

const unsub = mySub.subscribe(num => {
  console.log('num: ' + num);
});

mySub.call(45);

unsub();
