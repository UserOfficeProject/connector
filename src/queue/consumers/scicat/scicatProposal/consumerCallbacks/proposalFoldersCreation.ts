import { exec } from 'node:child_process';
import { env } from 'node:process';

import { logger } from '@user-office-software/duo-logger';

import { ValidProposalMessageData } from '../../../utils/validateProposalMessage';

const proposalFoldersCreation = async (
  proposalMessage: ValidProposalMessageData
) => {
  // prepare path with correct year, instrument, proposal
  const proposalId = proposalMessage.shortCode;
  const year = new Date().getFullYear().toString();
  const instrument = proposalMessage.instrument.shortCode.toLowerCase();
  logger.logInfo('Preparing year, instrument and proposal', {
    proposalId: proposalId,
    year: year,
    instrument: instrument,
  });

  // update command
  const command = (env.PROPOSAL_FOLDERS_CREATION_COMMAND! as string)
    .replace(/<INSTRUMENT>/, instrument)
    .replace(/<YEAR>/, year)
    .replace(/<PROPOSAL>/, proposalId);
  logger.logInfo('Command to be run', { command: command });

  // run command
  exec(command, (error, stdout, stderr) => {
    if (error) {
      logger.logError('Unable to create folders with error', {
        command: command,
        errorMessage: error.message,
      });

      return;
    }
    if (stderr) {
      logger.logError('Unable to create folders with stderr', {
        command: command,
        stderr: stderr,
      });

      return;
    }
    logger.logInfo('Proposal folder creation successful', {
      command: command,
      output: stdout,
    });
  });
};

export { proposalFoldersCreation };
