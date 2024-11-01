jest.mock('express', () => {
  const express = {
    use: jest.fn().mockReturnThis(),
    listen: jest.fn(),
  };

  return jest.fn(() => express);
});

jest.mock('@user-office-software/duo-logger');
jest.mock('./middlewares/metrics/metrics', () => jest.fn());
jest.mock('./middlewares/healthCheck', () => jest.fn());
jest.mock('./middlewares/readinessCheck', () => jest.fn());
jest.mock('tsyringe');

import { container } from 'tsyringe';

import { Tokens } from './config/Tokens';

describe('bootstrap', () => {
  const mockConfigureLogger = jest.fn();

  beforeEach(() => {
    container.resolve = jest.fn().mockReturnValue(mockConfigureLogger);
    require('./index');
  });

  it('should resolve the "ConfigureLogger" function and call it', () => {
    expect(container.resolve).toHaveBeenCalledWith(Tokens.ConfigureLogger);
    expect(mockConfigureLogger).toHaveBeenCalledTimes(1);
  });
});
