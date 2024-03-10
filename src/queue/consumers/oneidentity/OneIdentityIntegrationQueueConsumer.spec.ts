jest.mock('@user-office-software/duo-logger');
jest.mock('../QueueConsumer', () => ({
  QueueConsumer: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
  })),
}));
jest.mock('./consumerCallbacks/oneIdentityIntegrationHandler');

import { logger } from '@user-office-software/duo-logger';
import { MessageBroker } from '@user-office-software/duo-message-broker';
import { MessageProperties } from 'amqplib';

import { oneIdentityIntegrationHandler } from './consumerCallbacks/oneIdentityIntegrationHandler';
import { OneIdentityIntegrationQueueConsumer } from './OneIdentityIntegrationQueueConsumer';
import { Event } from '../../../models/Event';
import { ProposalMessageData } from '../../../models/ProposalMessage';
import { ProposalUser } from '../scicat/scicatProposal/dto';

describe('OneIdentityIntegrationQueueConsumer', () => {
  let consumer: OneIdentityIntegrationQueueConsumer;

  beforeEach(() => {
    consumer = new OneIdentityIntegrationQueueConsumer({} as MessageBroker);
  });

  describe('onMessage', () => {
    it('should not handle message if type is not PROPOSAL_ACCEPTED or PROPOSAL_UPDATED', async () => {
      const message = {} as ProposalMessageData;
      const type = Event.PROPOSAL_STATUS_ACTION_EXECUTED;

      const result = await consumer.onMessage(
        type,
        message,
        {} as MessageProperties
      );

      expect(result).toBeUndefined();
      expect(logger.logInfo).not.toHaveBeenCalled();
      expect(logger.logException).not.toHaveBeenCalled();
    });

    it('should not handle message if message is not ProposalMessageData', async () => {
      const message = {} as ProposalMessageData;
      const type = Event.PROPOSAL_ACCEPTED;

      await consumer.onMessage(type, message, {} as MessageProperties);

      expect(logger.logInfo).toHaveBeenCalledWith(
        'OneIdentityIntegrationQueueConsumer',
        {
          type,
          message,
        }
      );
      expect(logger.logError).toHaveBeenCalledWith('Invalid message', {
        message,
      });
      expect(logger.logException).not.toHaveBeenCalled();
    });

    it('should call oneIdentityIntegrationHandler and log message handled', async () => {
      const message = {
        shortCode: 'shortCode',
        proposer: { email: 'proposer-email' },
        members: [] as ProposalUser[],
      } as ProposalMessageData;
      const type = Event.PROPOSAL_ACCEPTED;

      await consumer.onMessage(type, message, {} as MessageProperties);

      expect(logger.logInfo).toHaveBeenNthCalledWith(
        1,
        'OneIdentityIntegrationQueueConsumer',
        {
          type,
          message,
        }
      );
      expect(logger.logInfo).toHaveBeenNthCalledWith(2, 'Message handled', {
        type,
        message,
      });
      expect(logger.logException).not.toHaveBeenCalled();
    });

    it('should log exception and re-throw error if oneIdentityIntegrationHandler throws', async () => {
      const message = {
        shortCode: 'shortCode',
        proposer: { email: 'proposer-email' },
        members: [] as ProposalUser[],
      } as ProposalMessageData;
      const type = Event.PROPOSAL_ACCEPTED;
      const error = new Error('Error');

      (oneIdentityIntegrationHandler as jest.Mock).mockRejectedValueOnce(error);

      await expect(
        consumer.onMessage(type, message, {} as MessageProperties)
      ).rejects.toThrow(error);

      expect(logger.logException).toHaveBeenCalledWith(
        'Error while handling proposal',
        error,
        {
          type,
          message,
        }
      );
    });
  });
});
