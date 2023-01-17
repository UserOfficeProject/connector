import { logger } from '@user-office-software/duo-logger';
import { RabbitMQMessageBroker } from '@user-office-software/duo-message-broker';
import { container } from 'tsyringe';

import { Tokens } from '../config/Tokens';
import { QueueConsumer } from './consumers/QueueConsumer';
import { sciCatConsumerCallback } from './consumers/scicat/sciCatConsumerCallback';

const connect = async () => {
  const rabbitMq = new RabbitMQMessageBroker();

  await rabbitMq
    .setup({
      hostname: process.env.RABBITMQ_HOSTNAME,
      username: process.env.RABBITMQ_USERNAME,
      password: process.env.RABBITMQ_PASSWORD,
    })
    .then(() => {
      logger.logInfo('Connected to RabbitMQ', {
        hostname: process.env.RABBITMQ_HOSTNAME,
        username: process.env.RABBITMQ_USERNAME,
        password: '********',
      });
    });

  return rabbitMq;
};

const startQueueHandling = async (): Promise<void> => {
  const rabbitMQ = await connect();
  const sciCatConsumer = container.resolve<QueueConsumer>(
    Tokens.SciCatConsumer
  );

  sciCatConsumer.start(rabbitMQ, sciCatConsumerCallback);
};

export default startQueueHandling;
