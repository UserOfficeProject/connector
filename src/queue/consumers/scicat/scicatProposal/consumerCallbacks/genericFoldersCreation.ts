import { exec } from 'node:child_process';

import { logger } from '@user-office-software/duo-logger';

const GENERIC_FOLDERS_CREATION_COMMAND =
  process.env.GENERIC_FOLDERS_CREATION_COMMAND;

const genericFoldersCreation = async (message: {
  context: string;
  item: string;
}) => {
  // prepare path with correct year, context(instrument_shortcode, course_id), item(proposal_shortcode, user_id)
  const item = message.item as string;
  const year = new Date().getFullYear().toString();
  const context = (message.context as string).toLowerCase();
  logger.logInfo('Preparing year, context and item', {
    item,
    year,
    context,
  });

  if (!GENERIC_FOLDERS_CREATION_COMMAND) {
    logger.logInfo('GENERIC_FOLDERS_CREATION_COMMAND env variable is missing', {
      command: GENERIC_FOLDERS_CREATION_COMMAND,
      errorMessage: 'GENERIC_FOLDERS_CREATION_COMMAND env variable is missing',
    });

    throw new Error('GENERIC_FOLDERS_CREATION_COMMAND env variable is missing');
  }

  // update command
  const command = GENERIC_FOLDERS_CREATION_COMMAND.replace(/<CONTEXT>/, context)
    .replace(/<YEAR>/, year)
    .replace(/<ITEM>/, item);
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
    logger.logInfo('Generic folder creation successful', {
      command: command,
      output: stdout,
    });
  });
};

export { genericFoldersCreation };
