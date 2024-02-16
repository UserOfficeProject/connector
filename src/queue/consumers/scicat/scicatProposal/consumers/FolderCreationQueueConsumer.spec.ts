jest.mock('../../../utils/validateMessages');
jest.mock('../../../utils/hasTriggeringStatus');
jest.mock('../../../utils/hasTriggeringType');
jest.mock('../../../QueueConsumer', () => ({
  QueueConsumer: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
  })),
}));
jest.mock('@user-office-software/duo-logger');

import { logger } from '@user-office-software/duo-logger';
import { MessageBroker } from '@user-office-software/duo-message-broker';

import { FolderCreationQueueConsumer } from './FolderCreationQueueConsumer';
import { hasTriggeringStatus } from '../../../utils/hasTriggeringStatus';
import { hasTriggeringType } from '../../../utils/hasTriggeringType';
import { validateProposalMessage } from '../../../utils/validateProposalMessage';

describe('FolderCreationQueueConsumer', () => {
  it.each([
    [false, false],
    [false, true],
    [true, false],
  ])(
    'should use logError when message does not have the correct type or status',
    (hasStatus, hasType) => {
      (validateProposalMessage as jest.Mock).mockReturnValueOnce({
        newStatus: 'newStatus',
      });
      (hasTriggeringStatus as jest.Mock).mockReturnValueOnce(hasStatus);
      (hasTriggeringType as jest.Mock).mockReturnValueOnce(hasType);
      const mockLoggerLogError = jest.spyOn(logger, 'logError');

      const consumer = new FolderCreationQueueConsumer({} as MessageBroker);

      consumer.onMessage('type', { message: 'message' }, {
        headers: {},
      } as any);

      expect(mockLoggerLogError).toHaveBeenCalledTimes(1);
      expect(mockLoggerLogError).toHaveBeenCalledWith(
        'Message does not have the correct type or status',
        {
          status: 'newStatus',
          type: 'type',
        }
      );
    }
  );
});
