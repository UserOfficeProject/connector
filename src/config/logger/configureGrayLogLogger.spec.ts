jest.mock('@user-office-software/duo-logger');
jest.mock('process', () => ({
  env: {
    GRAYLOG_SERVER: 'server',
    GRAYLOG_PORT: 1234,
    NODE_ENV: 'test',
  },
}));

import {
  ConsoleLogger,
  GrayLogLogger,
  setLogger,
} from '@user-office-software/duo-logger';

import { configureGraylogLogger } from './configureGrayLogLogger';

describe('configureGraylogLogger', () => {
  beforeEach(() => {
    (setLogger as jest.Mock).mockReturnValue(undefined);
  });

  it('should call the "setLogger" correctly', () => {
    configureGraylogLogger();

    expect(setLogger).toHaveBeenCalledTimes(1);
    expect(setLogger).toHaveBeenCalledWith([
      (ConsoleLogger as jest.Mock).mock.instances[0],
      (GrayLogLogger as jest.Mock).mock.instances[0],
    ]);

    expect(ConsoleLogger).toHaveBeenCalledTimes(1);
    expect(ConsoleLogger).toHaveBeenCalledWith();

    expect(GrayLogLogger).toHaveBeenCalledTimes(1);
    expect(GrayLogLogger).toHaveBeenCalledWith(
      'server',
      1234,
      { facility: 'DMSC', environment: 'test', service: 'connector' },
      []
    );
  });
});
