import { logger } from '@user-office-software/duo-logger';
import ConsumerService from '../consumers/KafkaConsumer';

export const connect = async (clientId: string) => {
  const kafka = new ConsumerService();

  // TODO: remove ssl and sasl if Nicos's producer don't use it.
  kafka
    .setup({
      clientId: process.env.KAFKA_CLIENTID || clientId,
      brokers: [`${process.env.KAFKA_BROKERS}:9092`],
      // ssl: false,
      // sasl: {
      //   mechanism: 'plain',
      //   username: process.env.KAFKA_USERNAME || 'test',
      //   password: process.env.KAFKA_PASSWORD || 'test',
      // },
    })
    .then(() => {
      logger.logInfo('Consumer setup configured', {
        clientId: process.env.KAFKA_CLIENTID,
        brokers: [`${process.env.KAFKA_BROKERS}:9092`],
      });
    })
    .catch((err) => {
      logger.logError('Consumer setup configure error ', err);
    });

  return kafka;
};
