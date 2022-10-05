import 'reflect-metadata';
import { MockQueueConsumer } from '../queue/consumers/mock/MockQueueConsumer';
import { configureConsoleLogger } from './logger/configureConsoleLogger';
import { Tokens } from './Tokens';
import { mapClass, mapValue } from './utils';

mapClass(Tokens.SciCatConsumer, MockQueueConsumer);
mapValue(Tokens.ConfigureLogger, configureConsoleLogger);
