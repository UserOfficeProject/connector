import 'reflect-metadata';
import getRabbitMqMessageBroker from '../queue/messageBroker/getRabbitMqMessageBroker';
import { configureConsoleLogger } from './logger/configureConsoleLogger';
import { Tokens } from './Tokens';
import { mapValue } from './utils';

mapValue(Tokens.ConfigureLogger, configureConsoleLogger);
mapValue(Tokens.ProvideMessageBroker, getRabbitMqMessageBroker);
