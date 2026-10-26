jest.mock('../../../utils/hasTriggeringStatus');
jest.mock('../../../utils/hasTriggeringType');
jest.mock('../../../utils/validateExperimentMessage');
jest.mock('../consumerCallbacks/upsertProposalInScicat');
jest.mock('../../../QueueConsumer', () => ({
  QueueConsumer: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
  })),
}));

import { MessageBroker } from '@user-office-software/duo-message-broker';

import { ExperimentCreationQueueConsumer } from './ExperimentCreationQueueConsumer';
import { hasTriggringExperimentStatus } from '../../../utils/hasTriggeringStatus';
import { hasTriggeringType } from '../../../utils/hasTriggeringType';
import { validateExperimentMessage } from '../../../utils/validateExperimentMessage';
import { upsertExperimentInScicat } from '../consumerCallbacks/upsertProposalInScicat';

describe('ExperimentCreationQueueConsumer', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should not process the message when it does not have the correct type', async () => {
    (hasTriggeringType as jest.Mock).mockReturnValueOnce(false);

    const consumer = new ExperimentCreationQueueConsumer({} as MessageBroker);

    await expect(
      consumer.onMessage('type', { message: 'message' }, {
        headers: {},
      } as any)
    ).resolves.not.toThrow();
    expect(upsertExperimentInScicat).not.toHaveBeenCalled();
  });

  it('should not process the message when it does not have the correct status', async () => {
    (hasTriggeringType as jest.Mock).mockReturnValueOnce(true);
    (hasTriggringExperimentStatus as jest.Mock).mockReturnValueOnce(false);

    const consumer = new ExperimentCreationQueueConsumer({} as MessageBroker);

    await expect(
      consumer.onMessage('type', { message: 'message' }, {
        headers: {},
      } as any)
    ).resolves.not.toThrow();
    expect(upsertExperimentInScicat).not.toHaveBeenCalled();
  });

  it('should upsert the experiment when the message has the correct type and status', async () => {
    (hasTriggeringType as jest.Mock).mockReturnValueOnce(true);
    (hasTriggringExperimentStatus as jest.Mock).mockReturnValueOnce(true);
    (validateExperimentMessage as jest.Mock).mockReturnValueOnce({
      experimentPk: 1,
    });
    (upsertExperimentInScicat as jest.Mock).mockResolvedValueOnce(undefined);

    const consumer = new ExperimentCreationQueueConsumer({} as MessageBroker);

    await expect(
      consumer.onMessage('type', { message: 'message' }, {
        headers: {},
      } as any)
    ).resolves.not.toThrow();
    expect(upsertExperimentInScicat).toHaveBeenCalledWith({ experimentPk: 1 });
  });

  it('should propagate errors from the upsert so the message is not acknowledged', async () => {
    (hasTriggeringType as jest.Mock).mockReturnValueOnce(true);
    (hasTriggringExperimentStatus as jest.Mock).mockReturnValueOnce(true);
    (validateExperimentMessage as jest.Mock).mockReturnValueOnce({
      experimentPk: 1,
    });
    (upsertExperimentInScicat as jest.Mock).mockRejectedValueOnce(
      new Error('UOS GraphQL errors')
    );

    const consumer = new ExperimentCreationQueueConsumer({} as MessageBroker);

    await expect(
      consumer.onMessage('type', { message: 'message' }, {
        headers: {},
      } as any)
    ).rejects.toThrow('UOS GraphQL errors');
  });
});
