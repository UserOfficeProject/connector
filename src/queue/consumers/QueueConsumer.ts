import {
  ConsumerCallback,
  RabbitMQMessageBroker,
} from '@user-office-software/duo-message-broker';

export interface QueueConsumer {
  start(
    rabbitMQ: RabbitMQMessageBroker,
    consumerCallback: ConsumerCallback
  ): void;
  isReady(): boolean;
}
