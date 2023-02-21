import { logger } from '@user-office-software/duo-logger';

import ConsumerService from '../consumers/KafkaConsumer';

export const connect = async (clientId: string) => {
  const kafka = new ConsumerService();

  kafka
    .setup({
      clientId: process.env.KAFKA_CLIENTID || clientId,
      brokers: [`${process.env.KAFKA_BROKERS}`],
    })
    .then(() => {
      logger.logInfo('Consumer setup configured', {
        clientId: process.env.KAFKA_CLIENTID || clientId,
        brokers: [`${process.env.KAFKA_BROKERS}`],
      });
    })
    .catch((reason) => {
      logger.logError('Consumer setup configure error ', { reason });
    });

  return kafka;
};
