import { logger } from '@user-office-software/duo-logger';
import 'dotenv/config';
import express from 'express';

import './config';
import validateEnv from './config/validateEnv';
import healthCheck from './middlewares/healthCheck';
import readinessCheck from './middlewares/readinessCheck';
import startKafkaTopicHandling from './queue/kafkaTopicHandling';
import startQueueHandling from './queue/queueHandling';
import { str2Bool } from './config/utils';

validateEnv();

async function bootstrap() {
  logger.logInfo('Server information: ', {
    nodeVersion: process.version,
    env: process.env.NODE_ENV,
  });
  const PORT = process.env.PORT || 4010;
  const app = express();

  const enableScicatProposalUpsert = str2Bool(process.env.ENABLE_SCICAT_PROPOSAL_UPSERT as string);
  const enableScichatRoomCreation = str2Bool(process.env.ENABLE_SCICHAT_ROOM_CREATION as string);
  const enableProposalFoldersCreation = str2Bool(process.env.ENABLE_PROPOSAL_FOLDERS_CREATION as string);
  const enableNicosToScichatMessages = str2Bool(process.env.ENABLE_NICOS_TO_SCICHAT_MESSAGES as string);

  logger.logInfo('Services configuration',{
    'SciCat_Proposal_Upsert' : enableScicatProposalUpsert,
    'Scichat_Room_Creation' : enableScichatRoomCreation,
    'Proposal_Folders_Creation' : enableProposalFoldersCreation,
    'Nicos_to_Scichat_Messages' : enableNicosToScichatMessages
  });

  app.use(healthCheck()).use(readinessCheck());

  app.listen(PORT);

  process.on('uncaughtException', (error) => {
    logger.logException('Unhandled NODE exception', error);
  });

  logger.logInfo(`Running connector service at localhost:${PORT}`, {});

  if (
    enableScicatProposalUpsert || enableScichatRoomCreation || enableProposalFoldersCreation
  ) {
    startQueueHandling();
  }

  if (
    enableNicosToScichatMessages
  ) {
    startKafkaTopicHandling();
  }
}

bootstrap();
