jest.mock('../../../utils/hasTriggeringStatus');
jest.mock('../../../utils/hasTriggeringType');
jest.mock('../../../utils/validateProposalMessage');
jest.mock('../consumerCallbacks/upsertProposalInScicat');
jest.mock('../../../QueueConsumer', () => ({
  QueueConsumer: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
  })),
}));

import { MessageBroker } from '@user-office-software/duo-message-broker';

import { ProposalCreationQueueConsumer } from './ProposalCreationQueueConsumer';
import { hasTriggeringProposalStatus } from '../../../utils/hasTriggeringStatus';
import { hasTriggeringType } from '../../../utils/hasTriggeringType';
import { validateProposalMessage } from '../../../utils/validateProposalMessage';
import { upsertProposalInScicat } from '../consumerCallbacks/upsertProposalInScicat';

describe('ProposalCreationQueueConsumer', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should not process the message when it does not have the correct type', async () => {
    (hasTriggeringType as jest.Mock).mockReturnValueOnce(false);

    const consumer = new ProposalCreationQueueConsumer({} as MessageBroker);

    await expect(
      consumer.onMessage('type', { message: 'message' }, {
        headers: {},
      } as any)
    ).resolves.not.toThrow();
    expect(upsertProposalInScicat).not.toHaveBeenCalled();
  });

  it('should not process the message when it does not have the correct status', async () => {
    (hasTriggeringType as jest.Mock).mockReturnValueOnce(true);
    (hasTriggeringProposalStatus as jest.Mock).mockReturnValueOnce(false);

    const consumer = new ProposalCreationQueueConsumer({} as MessageBroker);

    await expect(
      consumer.onMessage('type', { message: 'message' }, {
        headers: {},
      } as any)
    ).resolves.not.toThrow();
    expect(upsertProposalInScicat).not.toHaveBeenCalled();
  });

  it('should upsert the proposal when the message has the correct type and status', async () => {
    (hasTriggeringType as jest.Mock).mockReturnValueOnce(true);
    (hasTriggeringProposalStatus as jest.Mock).mockReturnValueOnce(true);
    (validateProposalMessage as jest.Mock).mockReturnValueOnce({
      proposalPk: 1,
    });
    (upsertProposalInScicat as jest.Mock).mockResolvedValueOnce(undefined);

    const consumer = new ProposalCreationQueueConsumer({} as MessageBroker);

    await expect(
      consumer.onMessage('type', { message: 'message' }, {
        headers: {},
      } as any)
    ).resolves.not.toThrow();
    expect(upsertProposalInScicat).toHaveBeenCalledWith({ proposalPk: 1 });
  });

  it('should propagate errors from the upsert so the message is not acknowledged', async () => {
    (hasTriggeringType as jest.Mock).mockReturnValueOnce(true);
    (hasTriggeringProposalStatus as jest.Mock).mockReturnValueOnce(true);
    (validateProposalMessage as jest.Mock).mockReturnValueOnce({
      proposalPk: 1,
    });
    (upsertProposalInScicat as jest.Mock).mockRejectedValueOnce(
      new Error('UOS GraphQL errors')
    );

    const consumer = new ProposalCreationQueueConsumer({} as MessageBroker);

    await expect(
      consumer.onMessage('type', { message: 'message' }, {
        headers: {},
      } as any)
    ).rejects.toThrow('UOS GraphQL errors');
  });
});
