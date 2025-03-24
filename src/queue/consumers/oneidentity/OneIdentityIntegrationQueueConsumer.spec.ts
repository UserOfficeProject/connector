jest.mock('@user-office-software/duo-logger');
jest.mock('../QueueConsumer', () => ({
  QueueConsumer: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
  })),
}));
jest.mock('./consumerCallbacks/syncProposalAndMembersToOneIdentityHandler');
jest.mock('./consumerCallbacks/syncVisitToOneIdentityHandler');
jest.mock('axios', () => ({
  isAxiosError: jest.fn(),
}));

import { logger } from '@user-office-software/duo-logger';
import { MessageBroker } from '@user-office-software/duo-message-broker';
import { MessageProperties } from 'amqplib';
import { isAxiosError } from 'axios';

import { syncProposalAndMembersToOneIdentityHandler } from './consumerCallbacks/syncProposalAndMembersToOneIdentityHandler';
import { syncVisitToOneIdentityHandler } from './consumerCallbacks/syncVisitToOneIdentityHandler';
import { OneIdentityIntegrationQueueConsumer } from './OneIdentityIntegrationQueueConsumer';
import { VisitMessage } from './utils/interfaces/VisitMessage';
import { Event } from '../../../models/Event';
import { ProposalMessageData } from '../../../models/ProposalMessage';

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

    it('should not handle message if message is not valid ProposalMessageData', async () => {
      const message = {} as ProposalMessageData;
      const type = Event.PROPOSAL_ACCEPTED;

      await expect(
        consumer.onMessage(type, message, {} as MessageProperties)
      ).rejects.toThrow('Invalid proposal message');
    });

    describe('syncProposalAndMembersToOneIdentityHandler', () => {
      it('should call syncProposalAndMembersToOneIdentityHandler and log message handled', async () => {
        const message = createProposalMessage({
          shortCode: 'shortCode',
          proposerEmail: 'proposer-email',
          memberEmails: [],
        });
        const type = Event.PROPOSAL_ACCEPTED;

        await consumer.onMessage(type, message, {} as MessageProperties);

        expect(syncProposalAndMembersToOneIdentityHandler).toHaveBeenCalledWith(
          message,
          type
        );
        expect(logger.logInfo).toHaveBeenNthCalledWith(
          1,
          'OneIdentityIntegrationQueueConsumer',
          {
            type,
            message,
          }
        );
        expect(logger.logInfo).toHaveBeenNthCalledWith(
          2,
          'Message handled by OneIdentityIntegrationQueueConsumer',
          {
            type,
            message,
          }
        );
        expect(logger.logException).not.toHaveBeenCalled();
      });

      it('should log exception and re-throw error if syncProposalAndMembersToOneIdentityHandler throws', async () => {
        const message = createProposalMessage({
          shortCode: 'shortCode',
          proposerEmail: 'proposer-email',
          memberEmails: [],
        });
        const type = Event.PROPOSAL_ACCEPTED;
        const error = new Error('Error');

        (
          syncProposalAndMembersToOneIdentityHandler as jest.Mock
        ).mockRejectedValueOnce(error);

        await expect(
          consumer.onMessage(type, message, {} as MessageProperties)
        ).rejects.toThrow(error);

        expect(logger.logException).toHaveBeenCalledWith(
          'Error while handling message in OneIdentityIntegrationQueueConsumer',
          error,
          {
            type,
            message,
          }
        );
      });

      it('should include Axios error response data in logs when available', async () => {
        const message = createProposalMessage({
          shortCode: 'shortCode',
          proposerEmail: 'proposer-email',
          memberEmails: [],
        });
        const type = Event.PROPOSAL_ACCEPTED;

        const axiosError = new Error('Axios Error');
        const mockResponse = {
          status: 400,
          headers: { 'content-type': 'application/json' },
          data: { message: 'Bad Request' },
        };

        Object.assign(axiosError, {
          isAxiosError: true,
          response: mockResponse,
        });

        (isAxiosError as unknown as jest.Mock).mockReturnValueOnce(true);
        (
          syncProposalAndMembersToOneIdentityHandler as jest.Mock
        ).mockRejectedValueOnce(axiosError);

        await expect(
          consumer.onMessage(type, message, {} as MessageProperties)
        ).rejects.toThrow(axiosError);

        expect(logger.logException).toHaveBeenCalledWith(
          'Error while handling message in OneIdentityIntegrationQueueConsumer',
          axiosError,
          {
            type,
            message,
            response: {
              status: mockResponse.status,
              headers: mockResponse.headers,
              data: mockResponse.data,
            },
          }
        );
      });
    });

    describe('syncVisitToOneIdentityHandler', () => {
      it('should call syncVisitToOneIdentityHandler and log message handled', async () => {
        const message = {
          visitorId: 'visitor-id',
          startAt: '2021-01-01T00:00:00Z',
          endAt: '2021-01-02T00:00:00Z',
        } as VisitMessage;
        const type = Event.VISIT_CREATED;

        jest.mock('./utils/validateVisitMessage', () => ({
          validateVisitMessage: jest.fn().mockReturnValue(message),
        }));

        await consumer.onMessage(type, message as any, {} as MessageProperties);

        expect(syncVisitToOneIdentityHandler).toHaveBeenCalledWith(
          message,
          type
        );
        expect(logger.logInfo).toHaveBeenNthCalledWith(
          1,
          'OneIdentityIntegrationQueueConsumer',
          {
            type,
            message,
          }
        );
        expect(logger.logInfo).toHaveBeenNthCalledWith(
          2,
          'Message handled by OneIdentityIntegrationQueueConsumer',
          {
            type,
            message,
          }
        );
        expect(logger.logException).not.toHaveBeenCalled();
      });

      it('should log exception with Axios error details when syncVisitToOneIdentityHandler throws an Axios error', async () => {
        const message = {
          visitorId: 'visitor-id',
          startAt: '2021-01-01T00:00:00Z',
          endAt: '2021-01-02T00:00:00Z',
        } as VisitMessage;
        const type = Event.VISIT_CREATED;

        const axiosError = new Error('Axios Error');
        const mockResponse = {
          status: 500,
          headers: { 'content-type': 'application/json' },
          data: { message: 'Internal Server Error' },
        };

        Object.assign(axiosError, {
          isAxiosError: true,
          response: mockResponse,
        });

        jest.mock('./utils/validateVisitMessage', () => ({
          validateVisitMessage: jest.fn().mockReturnValue(message),
        }));

        (isAxiosError as unknown as jest.Mock).mockReturnValueOnce(true);
        (syncVisitToOneIdentityHandler as jest.Mock) = jest
          .fn()
          .mockRejectedValueOnce(axiosError);

        await expect(
          consumer.onMessage(type, message as any, {} as MessageProperties)
        ).rejects.toThrow(axiosError);

        expect(logger.logException).toHaveBeenCalledWith(
          'Error while handling message in OneIdentityIntegrationQueueConsumer',
          axiosError,
          {
            type,
            message,
            response: {
              status: mockResponse.status,
              headers: mockResponse.headers,
              data: mockResponse.data,
            },
          }
        );
      });
    });
  });

  function createProposalMessage({
    shortCode,
    proposerEmail,
    memberEmails,
  }: {
    shortCode: string;
    proposerEmail: string;
    memberEmails: string[];
  }): ProposalMessageData {
    return {
      shortCode,
      proposer: { email: proposerEmail, firstName: 'first', lastName: 'last' },
      members: memberEmails.map((email) => ({ email })),
    } as ProposalMessageData;
  }
});
