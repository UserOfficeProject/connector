jest.mock('node:child_process');
jest.mock('node:process', () => ({
  env: {
    PROPOSAL_FOLDERS_CREATION_COMMAND: 'test command',
  },
}));
jest.mock('@user-office-software/duo-logger');

import { exec } from 'node:child_process';

import { logger } from '@user-office-software/duo-logger';

import { proposalFoldersCreation } from './proposalFoldersCreation';
import { ValidProposalMessageData } from '../../../utils/validateProposalMessage';

describe('proposalFoldersCreation', () => {
  const proposalMessage = {
    shortCode: 'shortCode',
    instrument: {
      shortCode: 'shortCode',
    },
  } as ValidProposalMessageData;
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

    proposalFoldersCreation(proposalMessage);

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

    proposalFoldersCreation(proposalMessage);

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
