import 'reflect-metadata';
import { RabbitMQConsumer } from '../queue/consumers/scicat/SciCatConsumer';
import { configureConsoleLogger } from './logger/configureConsoleLogger';
import { Tokens } from './Tokens';
import { mapClass, mapValue } from './utils';

mapClass(Tokens.SciCatConsumer, RabbitMQConsumer);
mapValue(Tokens.ConfigureLogger, configureConsoleLogger);
