import { logger } from '@user-office-software/duo-logger';
import 'dotenv/config';
import express from 'express';

import './config';
import validateEnv from './config/validateEnv';
import healthCheck from './middlewares/healthCheck';
import readinessCheck from './middlewares/readinessCheck';
import startKafkaTopicHandling from './queue/kafkaTopicHandling';
import startQueueHandling from './queue/queueHandling';

validateEnv();

async function bootstrap() {
  const PORT = process.env.PORT || 4010;
  const app = express();

  app.use(healthCheck()).use(readinessCheck());

  app.listen(PORT);

  process.on('uncaughtException', (error) => {
    logger.logException('Unhandled NODE exception', error);
  });

  logger.logInfo(`Running connector service at localhost:${PORT}`, {});

  startQueueHandling();
  startKafkaTopicHandling();
}

bootstrap();
