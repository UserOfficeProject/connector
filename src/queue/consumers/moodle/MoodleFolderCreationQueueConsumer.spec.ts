jest.mock('./utils/validateMoodleMessage');
jest.mock('../QueueConsumer', () => ({
  QueueConsumer: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
  })),
}));
jest.mock('@user-office-software/duo-logger');

import { logger } from '@user-office-software/duo-logger';
import { MessageBroker } from '@user-office-software/duo-message-broker';

import { MoodleFolderCreationQueueConsumer } from './MoodleFolderCreationQueueConsumer';
import { validateMoodleMessage } from './utils/validateMoodleMessage';

describe('MoodleFolderCreationQueueConsumer', () => {
  let mockLoggerLogError: jest.SpyInstance;

  beforeEach(() => {
    mockLoggerLogError = jest.spyOn(logger, 'logError');
  });

  it('should use logError when MOODLE_FOLDERS_CREATION_COMMAND env. variable is missing', async () => {
    (validateMoodleMessage as jest.Mock).mockReturnValueOnce(true);

    const consumer = new MoodleFolderCreationQueueConsumer({} as MessageBroker);

    const error = await consumer
      .onMessage('type', { message: 'message' }, {} as any)
      .then(() => {
        throw new Error('Should not be called');
      })
      .catch((err) => err);

    expect(error).toEqual(
      new Error('MOODLE_FOLDERS_CREATION_COMMAND env variable is missing')
    );
    expect(mockLoggerLogError).toHaveBeenCalledTimes(1);
    expect(mockLoggerLogError).toHaveBeenCalledWith(
      'MOODLE_FOLDERS_CREATION_COMMAND env variable is missing',
      {
        command: undefined,
        errorMessage: 'MOODLE_FOLDERS_CREATION_COMMAND env variable is missing',
      }
    );
  });

  it('should use logError when message is not valid', () => {
    (validateMoodleMessage as jest.Mock).mockReturnValueOnce(false);

    const consumer = new MoodleFolderCreationQueueConsumer({} as MessageBroker);

    consumer.onMessage('type', { message: 'message' }, {} as any);

    expect(mockLoggerLogError).toHaveBeenCalledTimes(1);
    expect(mockLoggerLogError).toHaveBeenCalledWith(
      'Message does not have the correct arguments',
      {
        arg0: 'type',
        message: {
          message: 'message',
        },
        properties: {},
      }
    );
  });
});
