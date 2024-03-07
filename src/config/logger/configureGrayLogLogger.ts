import process from 'process';

import {
  ConsoleLogger,
  GrayLogLogger,
  setLogger,
} from '@user-office-software/duo-logger';

export function configureGraylogLogger() {
  const server = process.env.GRAYLOG_SERVER;
  const port = process.env.GRAYLOG_PORT;

  if (server && port) {
    const env = process.env.NODE_ENV || 'unset';
    const service = process.env.SERVICE_NAME || 'connector';

    setLogger([
      new ConsoleLogger(),
      new GrayLogLogger(
        server,
        parseInt(port),
        { facility: 'DMSC', environment: env, service: service },
        []
      ),
    ]);
  } else {
    setLogger(new ConsoleLogger());
  }
}
