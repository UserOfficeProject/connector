import 'reflect-metadata';
import getMockMqMessageBroker from '../queue/messageBroker/getMockMessageBroker';
import { configureConsoleLogger } from './logger/configureConsoleLogger';
import { Tokens } from './Tokens';
import { mapValue } from './utils';

mapValue(Tokens.ConfigureLogger, configureConsoleLogger);
mapValue(Tokens.ProvideMessageBroker, getMockMqMessageBroker);
