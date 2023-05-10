import { logger } from '@user-office-software/duo-logger';
import express from 'express';

import '../config';
import { producerConnect } from './kafkaMessageProducer';
import validateEnv from '../config/validateEnv';
import healthCheck from '../middlewares/healthCheck';
import readinessCheck from '../middlewares/readinessCheck';

validateEnv();

const topic = process.env.KAFKA_TOPIC;
const messagesForTesting = {
  proposal: 'test222',
  instrument: 'scicat instrument',
  source: 'NICOS',
  message: 'Some messages sent via kafka',
};

async function bootstrap() {
  const PORT = process.env.PORT || 4011;
  const app = express();

  app.use(healthCheck()).use(readinessCheck());

  app.listen(PORT);

  process.on('uncaughtException', (error) => {
    logger.logException('Unhandled NODE exception', error);
  });

  logger.logInfo(`Running kafka producer service at localhost:${PORT}`, {});

  await producerConnect({
    topic: topic,
    messages: messagesForTesting,
    msgSendingInterval: 5000,
  });
}

bootstrap();
