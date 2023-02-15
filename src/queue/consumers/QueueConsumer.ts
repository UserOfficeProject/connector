import { logger } from '@user-office-software/duo-logger';
import {
  ConsumerCallback,
  Queue,
} from '@user-office-software/duo-message-broker';
import { container } from 'tsyringe';

import { Tokens } from '../../config/Tokens';
import { GetMessageBroker } from '../messageBroker/getMessageBroker';

export abstract class QueueConsumer {
  private queue: Queue | null = null;

  private getMessageBroker: GetMessageBroker = container.resolve(
    Tokens.ProvideMessageBroker
  );

  constructor(queue: Queue | null = null) {
    this.queue = queue;
    this.start();
  }

  getQueueName(): Queue | null {
    return this.queue;
  }


  abstract onMessage: ConsumerCallback;

  async start(): Promise<void> {
    const messageBroker = await this.getMessageBroker();
    const queue = this.queue;
    if (!queue) {
      logger.logInfo("Queue not defined",{ queue: queue });  
    }
    else {
      messageBroker.listenOn(queue, (...args) => {
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
      logger.logInfo("Listening on queue",{ queue: queue });
    }
  }
}
