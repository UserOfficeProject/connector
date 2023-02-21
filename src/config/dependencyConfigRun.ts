import 'reflect-metadata';
import { configureConsoleLogger } from './logger/configureConsoleLogger';
import { Tokens } from './Tokens';
import { mapValue } from './utils';
import getRabbitMqMessageBroker from '../queue/messageBroker/getRabbitMqMessageBroker';

mapValue(Tokens.ConfigureLogger, configureConsoleLogger);
mapValue(Tokens.ProvideMessageBroker, getRabbitMqMessageBroker);
