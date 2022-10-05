import { ConsoleLogger, setLogger } from '@user-office-software/duo-logger';

export function configureConsoleLogger() {
  setLogger(new ConsoleLogger());
}
