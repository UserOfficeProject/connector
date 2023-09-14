jest.mock('node:child_process');
jest.mock('@user-office-software/duo-logger');

import { exec } from 'node:child_process';

import { logger } from '@user-office-software/duo-logger';

import { genericFoldersCreation } from './genericFoldersCreationCallBack';

describe('genericFoldersCreation', () => {
  let mockLoggerLogError: jest.SpyInstance;

  beforeEach(() => {
    mockLoggerLogError = jest.spyOn(logger, 'logError');
  });

  it('should use logError when the cb function of "exec" command is called with an error', () => {
    (exec as unknown as jest.Mock).mockImplementationOnce(
      (command, callback) => {
        callback(new Error('test error'), undefined, undefined);
      }
    );

    genericFoldersCreation({ test: 'test' }, 'test command');

    expect(mockLoggerLogError).toHaveBeenCalledTimes(1);
    expect(mockLoggerLogError).toHaveBeenCalledWith(
      'Unable to create folders with error',
      {
        command: 'test command',
        errorMessage: 'test error',
      }
    );
  });

  it('should use logError when the cb function of "exec" command is called with stderr', () => {
    (exec as unknown as jest.Mock).mockImplementationOnce(
      (command, callback) => {
        callback(undefined, undefined, 'test stderr');
      }
    );

    genericFoldersCreation({ test: 'test' }, 'test command');

    expect(mockLoggerLogError).toHaveBeenCalledTimes(1);
    expect(mockLoggerLogError).toHaveBeenCalledWith(
      'Unable to create folders with stderr',
      {
        command: 'test command',
        stderr: 'test stderr',
      }
    );
  });
});
