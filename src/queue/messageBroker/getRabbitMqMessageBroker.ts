import { logger } from '@user-office-software/duo-logger';
import { RabbitMQMessageBroker } from '@user-office-software/duo-message-broker';

import { GetMessageBroker } from './getMessageBroker';

let rabbitMq: RabbitMQMessageBroker | undefined;

const getRabbitMqMessageBroker: GetMessageBroker = async () => {
  if (rabbitMq) {
    return rabbitMq;
  }

  rabbitMq = new RabbitMQMessageBroker();

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

export default getRabbitMqMessageBroker;
