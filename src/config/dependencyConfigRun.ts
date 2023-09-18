import 'reflect-metadata';
import { configureGraylogLogger } from './logger/configureGrayLogLogger';
import { Tokens } from './Tokens';
import { mapValue, str2Bool } from './utils';
import getRabbitMqMessageBroker from '../queue/messageBroker/getRabbitMqMessageBroker';
import { SynapseService } from '../services/synapse/SynapseService';

mapValue(Tokens.ConfigureLogger, configureGraylogLogger);
mapValue(Tokens.ProvideMessageBroker, getRabbitMqMessageBroker);

const enableNicosToScichatMessages = str2Bool(
  process.env.ENABLE_NICOS_TO_SCICHAT_MESSAGES as string
);

const enableScichatRoomCreation = str2Bool(
  process.env.ENABLE_SCICHAT_ROOM_CREATION as string
);

mapValue(
  Tokens.SynapseService,
  enableNicosToScichatMessages || enableScichatRoomCreation
    ? new SynapseService()
    : {}
);
