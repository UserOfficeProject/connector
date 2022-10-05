import {
  ConsumerCallback,
  Queue,
  RabbitMQMessageBroker,
} from '@user-office-software/duo-message-broker';

import { QueueConsumer } from '../QueueConsumer';

export class RabbitMQConsumer implements QueueConsumer {
  private consumerCallback?: ConsumerCallback;

  start(
    rabbitMQ: RabbitMQMessageBroker,
    consumerCallback: ConsumerCallback
  ): void {
    this.consumerCallback = consumerCallback;

    rabbitMQ.listenOn(Queue.SCICAT_PROPOSAL, this.consumerCallback);
  }

  isReady() {
    return this.consumerCallback !== undefined; // TODO check if connection is established
  }
}
