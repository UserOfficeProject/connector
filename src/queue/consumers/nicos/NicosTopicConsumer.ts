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
          const messageVal = JSON.parse(message.value?.toString() as string);

          try {
            const validMessage = validateNicosMessage(messageVal);

            await postNicosMessage({
              roomName: validMessage.proposal,
              message: validMessage.message,
            });
          } catch (error) {
            logger.logError('Failed processing message', {
              messageOffset: message.offset,
              reason: (error as Error).message,
            });

            // Note: By return consumer skip current error message and continue consuming
            return;
          }
        },
      }
    );
  }
}
