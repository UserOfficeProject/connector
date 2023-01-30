import { logger } from '@user-office-software/duo-logger';
import 'dotenv/config';
import express from 'express';

import './config';
import validateEnv from './config/validateEnv';
import healthCheck from './middlewares/healthCheck';
import readinessCheck from './middlewares/readinessCheck';
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

  startQueueHandling();
}

bootstrap();
