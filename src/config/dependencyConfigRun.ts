import 'reflect-metadata';
import { configureConsoleLogger } from './logger/configureConsoleLogger';
import { Tokens } from './Tokens';
import { mapClass, mapValue, str2Bool } from './utils';
import getRabbitMqMessageBroker from '../queue/messageBroker/getRabbitMqMessageBroker';
import { SynapseService } from '../services/synapse/SynapseService';

mapValue(Tokens.ConfigureLogger, configureConsoleLogger);
mapValue(Tokens.ProvideMessageBroker, getRabbitMqMessageBroker);

const enableNicosToScichatMessages = str2Bool(
    process.env.ENABLE_NICOS_TO_SCICHAT_MESSAGES as string
);

mapValue(Tokens.SynapseService, ( enableNicosToScichatMessages ? new SynapseService() : {}));
