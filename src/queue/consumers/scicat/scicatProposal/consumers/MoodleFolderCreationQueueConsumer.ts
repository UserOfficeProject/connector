import { logger } from '@user-office-software/duo-logger';
import { ConsumerCallback } from '@user-office-software/duo-message-broker';

import { MoodleMessageData } from '../../../../../models/MoodleMessage';
import { QueueConsumer } from '../../../QueueConsumer';
import { genericFoldersCreation } from '../consumerCallbacks/genericFoldersCreation';
import { validateMoodleMessage } from '../utils/validateMessages';

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
      genericFoldersCreation(validMessage);
    } else {
      logger.logInfo('Message does not have the correct arguments', {
        arg0,
        message,
        properties,
      });
    }
  };
}
