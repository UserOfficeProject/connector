import { logger } from '@user-office-software/duo-logger';
import { ConsumerCallback } from '@user-office-software/duo-message-broker';

import { MoodleMessageData } from '../../../../../models/MoodleMessage';
import { QueueConsumer } from '../../../QueueConsumer';
import { genericFoldersCreation } from '../consumerCallbacks/genericFoldersCreation';
import { validateMoodleMessage } from '../utils/validateMessages';

const MOODLE_FOLDERS_CREATION_COMMAND =
  process.env.MOODLE_FOLDERS_CREATION_COMMAND;

export class MoodleFolderCreationQueueConsumer extends QueueConsumer {
  getQueueName(): string {
    return process.env.MOODLE_FOLDER_CREATION_QUEUE_NAME as string;
  }

  getExchangeName(): string {
    return process.env.MOODLE_EXCHANGE_NAME as string;
  }

  onMessage: ConsumerCallback = async (arg0, message, properties) => {
    const validMessage = validateMoodleMessage(message as MoodleMessageData);

    if (validMessage) {
      if (!MOODLE_FOLDERS_CREATION_COMMAND) {
        logger.logInfo(
          'MOODLE_FOLDERS_CREATION_COMMAND env variable is missing',
          {
            command: MOODLE_FOLDERS_CREATION_COMMAND,
            errorMessage:
              'MOODLE_FOLDERS_CREATION_COMMAND env variable is missing',
          }
        );

        throw new Error(
          'MOODLE_FOLDERS_CREATION_COMMAND env variable is missing'
        );
      }

      genericFoldersCreation(validMessage, MOODLE_FOLDERS_CREATION_COMMAND);
    } else {
      logger.logInfo('Message does not have the correct arguments', {
        arg0,
        message,
        properties,
      });
    }
  };
}
