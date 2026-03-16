import { logger } from '@user-office-software/duo-logger';
import { container } from 'tsyringe';

import ConsumerService from '../KafkaConsumer';
import { validateNicosMessage } from './utils/validateNicosMessage';
import { Tokens } from '../../../config/Tokens';
import { SynapseService } from '../../../services/synapse/SynapseService';

export class TopicSciChatConsumer {
  constructor(private _consumer: ConsumerService) {}
  async start(topic: string) {
    const synapseService: SynapseService = container.resolve(
      Tokens.SynapseService
    );
    await synapseService.login('TopicSciChatConsumer');

    this._consumer.consume(
      `${process.env.KAFKA_CLIENTID}`,
      { topics: [topic] },
      {
        eachMessage: async ({ message }) => {
          try {
            const messageData = JSON.parse(message.value?.toString() as string);
            const validMessageData = validateNicosMessage(messageData);

            await synapseService.sendMessage(
              validMessageData.proposal,
              validMessageData.message
            );
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
