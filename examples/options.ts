import { Subscription } from '../dist';

const mySub = Subscription.create<number>({
  onFirstSubscription: () => {
    console.log('Firts sub !');
  },
  onLastUnsubscribe: () => {
    console.log('No listener left !');
  }
});

const unsub = mySub.subscribe(num => {
  console.log('num: ' + num);
}); // Firts sub !

mySub.call(45);

unsub(); // No listener left !
