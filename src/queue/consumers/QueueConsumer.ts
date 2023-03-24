import { logger } from '@user-office-software/duo-logger';
import {
  ConsumerCallback,
  Queue,
} from '@user-office-software/duo-message-broker';
import { container } from 'tsyringe';

import { Tokens } from '../../config/Tokens';
import { GetMessageBroker } from '../messageBroker/getMessageBroker';

export abstract class QueueConsumer {
  private getMessageBroker: GetMessageBroker = container.resolve(
    Tokens.ProvideMessageBroker
  );

  constructor() {
    logger.logInfo(`QueueConsumer ${this.constructor.name} created`, {});
    this.start();
  }

  abstract getQueueName(): string;
  abstract getExchangeName(): string;

  abstract onMessage: ConsumerCallback;

  async start(): Promise<void> {
    const queueName = this.getQueueName();

    if (!queueName) {
      throw new Error(
        `Queue name variable not set for consumer ${this.constructor.name}`
      );
    }
    const exchangeName = this.getExchangeName();

    if (!exchangeName) {
      throw new Error(
        `Exchange name variable not set for consumer ${this.constructor.name}`
      );
    }

    const messageBroker = await this.getMessageBroker();
    await messageBroker.bindQueueToExchange(queueName, exchangeName);

    messageBroker.listenOn(queueName as Queue, async (...args) => {
      logger.logInfo('Received message on queue', { queueName });
      try {
        await this.onMessage(...args);
      } catch (error) {
        logger.logException('Error while handling QueueConsumer callback: ', {
          queue: this.getQueueName(),
          consumer: this.constructor.name,
          args,
          error,
        });
      }
    });
    logger.logInfo('Listening on queue', { queueName });
  }
}
