import { logger } from '@user-office-software/duo-logger';

import { postNicosMessage } from './consumerCallbacks/postNicosMessage';
import { validateNicosMessage } from './utils/validateNicosMessage';
import ConsumerService from '../KafkaConsumer';

export class TopicSciChatConsumer {
  constructor(private _consumer: ConsumerService) {}
  async start(topic: string) {
    this._consumer.consume(
      `${process.env.KAFKA_CLIENTID}`,
      { topics: [topic] },
      {
        eachMessage: async ({ message }) => {
          try {
            const messageData = JSON.parse(message.value?.toString() as string);
            const validMessageData = validateNicosMessage(messageData);

            await postNicosMessage({
              roomName: validMessageData.proposal,
              message: validMessageData.message,
            });
          } catch (error) {
            logger.logError('Failed processing message', {
              // Note: offset is similar to the index of the message
              messageOffset: message.offset,
              reason: (error as Error).message,
            });

            // Note: This catch block will throw error and skips error message to continue consuming next message.
            return;
          }
        },
      }
    );
  }
}
