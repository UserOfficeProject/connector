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
  logger.logInfo('Server information: ', {
    nodeVersion: process.version,
    env: process.env.NODE_ENV,
  });
  const PORT = process.env.PORT || 4010;
  const app = express();

  app.use(healthCheck()).use(readinessCheck());

  app.listen(PORT);

  process.on('uncaughtException', (error) => {
    logger.logException('Unhandled NODE exception', error);
  });

  logger.logInfo(`Running connector service at localhost:${PORT}`, {});

  if (
    process.env.ENABLE_SCICAT_PROPOSAL_UPSERT ||
    process.env.ENABLE_SCICHAT_ROOM_CREATION ||
    process.env.ENABLE_PROPOSAL_FOLDERS_CREATION
  ) {
    startQueueHandling();
  }

  if (
    process.env.ENABLE_NICOS_TO_SCICHAT_MESSAGES
  ) {
    startKafkaTopicHandling();
  }
}

bootstrap();
