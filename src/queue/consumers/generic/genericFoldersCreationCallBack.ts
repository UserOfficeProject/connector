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
    command = command.replace(`<${key.toUpperCase()}>`, value);
  }

  return command;
};

const genericFoldersCreation = async (
  message: Record<string, string>,
  originalCommand: string,
  messageModifier?: (message: Record<string, string>) => Record<string, string>
) => {
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
