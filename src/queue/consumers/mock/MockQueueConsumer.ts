import {
  ConsumerCallback,
  RabbitMQMessageBroker,
} from '@user-office-software/duo-message-broker';
import { MessageProperties } from 'amqplib';

import { Event } from '../../../models/Event';
import { QueueConsumer } from '../QueueConsumer';

export class MockQueueConsumer implements QueueConsumer {
  private consumerCallback?: ConsumerCallback;

  start(
    rabbitMQ: RabbitMQMessageBroker,
    consumerCallback: ConsumerCallback
  ): void {
    this.consumerCallback = consumerCallback;
  }

  isReady(): boolean {
    return true;
  }

  queueMessage(
    type: Event,
    message: Record<string, unknown>,
    properties: MessageProperties
  ): void {
    this.consumerCallback?.(type, message, properties);
  }
}
