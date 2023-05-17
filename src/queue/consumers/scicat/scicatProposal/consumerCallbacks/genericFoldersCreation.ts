import { exec } from 'node:child_process';

import { logger } from '@user-office-software/duo-logger';

/**
 * NOTE:
 * @param modifiedMessage Message object with correct keys that will replace the command placeholders with values
 * @param originalCommand Command that will be run containing placeholders that will be replaced with real values in this function.
 * @returns Command that will be run replaced with real values in this function.
 */
const getCommandReplacedWithValues = (
  modifiedMessage: Record<string, string>,
  originalCommand: string
) => {
  let command = originalCommand;

  for (const [key, value] of Object.entries(modifiedMessage)) {
    command = originalCommand.replace(`<${key.toUpperCase()}>`, value);
  }

  return command;
};

const genericFoldersCreation = async (
  message: Record<string, string>,
  originalCommand: string,
  messageModifier?: (message: Record<string, string>) => Record<string, string>
) => {
  // prepare path with correct year, context(instrument_shortcode, course_id), item(proposal_shortcode, user_id)
  const item = message.item as string;
  const year = new Date().getFullYear().toString();
  const context = (message.context as string).toLowerCase();
  logger.logInfo('Preparing year, context and item', {
    item,
    year,
    context,
  });

  let modifiedMessage = { ...message };

  if (messageModifier) {
    modifiedMessage = messageModifier(message);
  }

  const command = getCommandReplacedWithValues(
    modifiedMessage,
    originalCommand
  );

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
