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
    this.start();
  }

  abstract getQueueName(): Queue;
  abstract onMessage: ConsumerCallback;

  async start(): Promise<void> {
    const messageBroker = await this.getMessageBroker();
    messageBroker.listenOn(this.getQueueName(), (...args) => {
      try {
        return this.onMessage(...args);
      } catch (error) {
        logger.logException('Error while handling QueueConsumer callback: ', {
          args,
          error,
        });

        throw error;
      }
    });
  }
}

export interface KafkaQueueConsumer {
  start(kafka: any, consumerCallback: any): void;
  isReady(): boolean;
}
