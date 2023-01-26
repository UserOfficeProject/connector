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

export interface KafkaQueueConsumer {
  start(kafka: any, consumerCallback: any): void;
  isReady(): boolean;
}
