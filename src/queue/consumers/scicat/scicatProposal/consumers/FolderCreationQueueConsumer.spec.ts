jest.mock('../../../utils/validateMessages');
jest.mock('../../../utils/hasTriggeringStatus');
jest.mock('../../../utils/hasTriggeringType');
jest.mock('../../../QueueConsumer', () => ({
  QueueConsumer: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
  })),
}));

import { MessageBroker } from '@user-office-software/duo-message-broker';

import { FolderCreationQueueConsumer } from './FolderCreationQueueConsumer';
import { hasTriggeringStatus } from '../../../utils/hasTriggeringStatus';
import { hasTriggeringType } from '../../../utils/hasTriggeringType';
import { validateProposalMessage } from '../../../utils/validateMessages';

describe('FolderCreationQueueConsumer', () => {
  it.each([
    [false, false],
    [false, true],
    [true, false],
  ])(
    'should not throw error when message does not have the correct type or status',
    (hasStatus, hasType) => {
      (validateProposalMessage as jest.Mock).mockReturnValueOnce({
        newStatus: 'newStatus',
      });
      (hasTriggeringStatus as jest.Mock).mockReturnValueOnce(hasStatus);
      (hasTriggeringType as jest.Mock).mockReturnValueOnce(hasType);

      const consumer = new FolderCreationQueueConsumer({} as MessageBroker);

      expect(() => {
        consumer.onMessage('type', { message: 'message' }, {
          headers: {},
        } as any);
      }).not.toThrow();
    }
  );
});
