import { exec } from 'node:child_process';

import { logger } from '@user-office-software/duo-logger';
import fetch from 'node-fetch';

import { ValidProposalMessageData } from '../utils/validateProposalMessage';

const folderCreationCommand = process.env.FOLDER_CREATION_COMMAND;

const getInstrumentName = async (proposalId: string) => {
  const response = await fetch(process.env.USER_OFFICE_GRAPHQL_URL! as string, {
    headers: {
      'content-type': 'application/json',
      Authorization: 'Bearer ' + process.env.USER_OFFICE_JWT,
    },
    body:
      '{"operationName":null,"variables":{},"query":"{\\n  proposalById(proposalId: \\"' +
      proposalId +
      '\\") {\\n    title\\n    instrument {\\n      name\\n    }\\n  }\\n}\\n"}',
    method: 'POST',
  });

  try {
    const {
      proposalById: { instrument: name },
    } = await response.json();

    return name as string;
  } catch (error) {
    logger.logError('Request for instrument name failed', {
      error: error,
      statusCode: response.status,
      statusText: response.statusText,
      body: response.body,
    });
  }
};

const proposalFoldersCreation = async (
  proposalMessage: ValidProposalMessageData
) => {
  // prepare path with correct year, instrument, proposal
  const proposalId = proposalMessage.shortCode;
  const year = new Date().getFullYear().toString();
  const instrument = proposalMessage.instrument.shortCode;
  logger.logInfo('Preparing year, instrument and proposal', {
    proposalId: proposalId,
    year: year,
    instrument: instrument,
  });

  // update command
  const command = (process.env.PROPOSAL_FOLDERS_CREATION_COMMAND! as string)
    .replace(/<INSTRUMENT>/, instrument)
    .replace(/<YEAR>/, year)
    .replace(/<PROPOSAL>/, proposalId);
  logger.logInfo('Command to be run', { command: command });

  // run command
  exec(command, (error, stdout, stderr) => {
    if (error) {
      logger.logInfo('Unable to create folders with error', {
        command: command,
        errorMessage: error.message,
      });

      return;
    }
    if (stderr) {
      logger.logInfo('Unable to create folders with stderr', {
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
