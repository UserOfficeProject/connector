import 'reflect-metadata';
import { logger } from '@user-office-software/duo-logger';
import express from 'express';
import { container } from 'tsyringe';

import './config';
import { ConfigureLogger } from './config/logger/ConfigureLogger';
import { Tokens } from './config/Tokens';
import { str2Bool } from './config/utils';
import validateEnv from './config/validateEnv';
import healthCheck from './middlewares/healthCheck';
import readinessCheck from './middlewares/readinessCheck';
import startKafkaTopicHandling from './queue/kafkaTopicHandling';
import startRabbitMQHandling from './queue/queueHandling';

validateEnv();

const configureLogger = container.resolve<ConfigureLogger>(
  Tokens.ConfigureLogger
);

async function bootstrap() {
  configureLogger();

  logger.logInfo('Server information: ', {
    nodeVersion: process.version,
    env: process.env.NODE_ENV,
  });
  const PORT = process.env.PORT || 4010;
  const app = express();

  const enableScicatProposalUpsert = str2Bool(
    process.env.ENABLE_SCICAT_PROPOSAL_UPSERT as string
  );
  const enableScichatRoomCreation = str2Bool(
    process.env.ENABLE_SCICHAT_ROOM_CREATION as string
  );
  const enableProposalFoldersCreation = str2Bool(
    process.env.ENABLE_PROPOSAL_FOLDERS_CREATION as string
  );
  const enableNicosToScichatMessages = str2Bool(
    process.env.ENABLE_NICOS_TO_SCICHAT_MESSAGES as string
  );
  const enableMoodleFoldersCreation = str2Bool(
    process.env.ENABLE_MOODLE_FOLDERS_CREATION as string
  );

  logger.logInfo('Services configuration', {
    SciCat_Proposal_Upsert: enableScicatProposalUpsert,
    Scichat_Room_Creation: enableScichatRoomCreation,
    Proposal_Folders_Creation: enableProposalFoldersCreation,
    Nicos_to_Scichat_Messages: enableNicosToScichatMessages,
    Moodle_Folders_Creation: enableMoodleFoldersCreation,
  });

  app.use(healthCheck()).use(readinessCheck());

  app.listen(PORT);

  process.on('uncaughtException', (error) => {
    logger.logException('Unhandled NODE exception', error);
  });

  logger.logInfo(`Running connector service at localhost:${PORT}`, {});

  if (
    enableScicatProposalUpsert ||
    enableScichatRoomCreation ||
    enableProposalFoldersCreation ||
    enableMoodleFoldersCreation
  ) {
    startRabbitMQHandling();
  }

  if (enableNicosToScichatMessages) {
    startKafkaTopicHandling();
  }
}

bootstrap();
