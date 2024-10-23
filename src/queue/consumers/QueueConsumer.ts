import { logger } from '@user-office-software/duo-logger';
import {
  ConsumerCallback,
  MessageBroker,
  Queue,
} from '@user-office-software/duo-message-broker';

import {
  processedMessagesCounter,
  processingDurationHistogram,
} from '../../middlewares/metrics/customMetrics';

export abstract class QueueConsumer {
  private messageBroker: MessageBroker;

  constructor(messageBroker: MessageBroker) {
    this.messageBroker = messageBroker;
    logger.logInfo(`QueueConsumer ${this.constructor.name} created`, {});
    this.start();
  }

  abstract getQueueName(): string;
  abstract getExchangeName(): string;

  // NOTE: This function is used for message modifications if needed in some specific scenarios where we have to organize the message keys differently.
  // In the handler it is mapped one to one which means that it tries to find a <KEY> for each message "key".
  protected messageModifier?(
    message: Record<string, string>
  ): Record<string, string>;

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

    await this.messageBroker.addQueueToExchangeBinding(queueName, exchangeName);

    this.messageBroker.listenOn(queueName as Queue, async (...args) => {
      logger.logInfo('Received message on queue', { queueName });

      // Start tracking processing time
      const endTimer = processingDurationHistogram.startTimer({
        queue: queueName,
      });

      try {
        await this.onMessage(...args);

        // Increment the success counter
        processedMessagesCounter.inc({ queue: queueName, status: 'success' });
      } catch (error) {
        logger.logException('Error while handling QueueConsumer callback: ', {
          error: (error as Error).message,
          queue: this.getQueueName(),
          consumer: this.constructor.name,
          args,
        });

        // Increment the failure counter
        processedMessagesCounter.inc({ queue: queueName, status: 'failure' });

        // Re-throw the error to make sure the message is not acknowledged
        throw error;
      } finally {
        // Stop the timer
        endTimer();
      }
    });
    logger.logInfo('Listening on queue', { queueName });
  }
}
