import { logger } from '@user-office-software/duo-logger';
import 'dotenv/config';
import express from 'express';

import '../config';
import validateEnv from '../config/validateEnv';
import { producerConnect } from './kafkaMessageProducer';
import healthCheck from '../middlewares/healthCheck';
import readinessCheck from '../middlewares/readinessCheck';

validateEnv();

async function bootstrap() {
  const PORT = process.env.PORT || 4011;
  const app = express();

  app.use(healthCheck()).use(readinessCheck());

  app.listen(PORT);

  process.on('uncaughtException', (error) => {
    logger.logException('Unhandled NODE exception', error);
  });

  logger.logInfo(`Running kafka producer service at localhost:${PORT}`, {});

  //Connect and send messages on every {interval} milliseconds
  await producerConnect({ interval: 5000 });
}

bootstrap();
