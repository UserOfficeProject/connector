jest.mock('node:child_process');
jest.mock('node:process', () => ({
  env: {
    PROPOSAL_FOLDERS_CREATION_COMMAND: 'test command',
  },
}));
jest.mock('@user-office-software/duo-logger');

import { exec } from 'node:child_process';
import { env } from 'node:process';

import { logger } from '@user-office-software/duo-logger';

import { proposalFoldersCreation } from './proposalFoldersCreation';
import { ValidProposalMessageData } from '../../../utils/validateProposalMessage';

describe('proposalFoldersCreation', () => {
  const proposalMessage = {
    shortCode: 'shortCode',
    instruments: [
      {
        shortCode: 'shortCode',
      },
    ],
    proposer: {
      email: 'test.proposer@email.com',
    },
    members: [{ email: 'test.member@email.com' }],
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

  it('should call exec with the correct command', () => {
    env.PROPOSAL_FOLDERS_CREATION_COMMAND =
      'command <INSTRUMENT> <YEAR> <PROPOSAL> <GROUP> <PROPOSER_EMAIL> <MEMBERS_EMAILS>';
    env.PROPOSAL_FOLDERS_CREATION_GROUP_PREFIX = 'group_prefix_';
    (exec as unknown as jest.Mock).mockImplementationOnce(
      (command, callback) => {
        callback(undefined, '', undefined);
      }
    );

    proposalFoldersCreation(proposalMessage);

    expect(exec).toHaveBeenCalledTimes(1);
    expect(exec).toHaveBeenCalledWith(
      'command shortcode 2024 shortCode group_prefix_shortCode test.proposer@email.com test.member@email.com',
      expect.any(Function)
    );
  });
});
