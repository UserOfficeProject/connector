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

describe('FolderCreationQueueConsumer', () => {
  it('should not throw an error when message does not have the correct type and status', async () => {
    (hasTriggeringType as jest.Mock).mockReturnValueOnce(false);
    (hasTriggeringStatus as jest.Mock).mockReturnValueOnce(false);

    const consumer = new FolderCreationQueueConsumer({} as MessageBroker);

    await expect(
      consumer.onMessage('type', { message: 'message' }, {
        headers: {},
      } as any)
    ).resolves.not.toThrow();
  });

  it('should not throw an error when message does have the incorrect type and correct status', async () => {
    (hasTriggeringType as jest.Mock).mockReturnValueOnce(false);
    (hasTriggeringStatus as jest.Mock).mockReturnValueOnce(true);

    const consumer = new FolderCreationQueueConsumer({} as MessageBroker);

    await expect(
      consumer.onMessage('type', { message: 'message' }, {
        headers: {},
      } as any)
    ).resolves.not.toThrow();
  });

  it('should not throw an error when message does have the correct type and incorrect status', async () => {
    (hasTriggeringType as jest.Mock).mockReturnValueOnce(true);
    (hasTriggeringStatus as jest.Mock).mockReturnValueOnce(false);

    const consumer = new FolderCreationQueueConsumer({} as MessageBroker);

    await expect(
      consumer.onMessage('type', { message: 'message' }, {
        headers: {},
      } as any)
    ).resolves.not.toThrow();
  });

  it('should throw error when invalid message does have the correct type or status', async () => {
    (hasTriggeringStatus as jest.Mock).mockReturnValueOnce(true);
    (hasTriggeringType as jest.Mock).mockReturnValueOnce(true);

    const consumer = new FolderCreationQueueConsumer({} as MessageBroker);

    await expect(
      consumer.onMessage('type', { message: 'message' }, {
        headers: {},
      } as any)
    ).rejects.toThrow();
  });
});
