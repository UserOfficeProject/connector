import { configureConsoleLogger } from './configureConsoleLogger';
import { configureGraylogLogger } from './configureGrayLogLogger';

export type ConfigureLogger =
  | typeof configureConsoleLogger
  | typeof configureGraylogLogger;
