jest.mock('@user-office-software/duo-logger');
jest.mock('../QueueConsumer', () => ({
  QueueConsumer: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
  })),
}));
jest.mock('./utils/ESSOneIdentity', () => ({
  ESSOneIdentity: jest.fn().mockImplementation(() => mockOneIdentity),
}));

import { MessageBroker } from '@user-office-software/duo-message-broker';
import { MessageProperties } from 'amqplib';

import { OneIdentityIntegrationQueueConsumer } from './OneIdentityIntegrationQueueConsumer';
import { Event } from '../../../models/Event';
import { ProposalMessageData } from '../../../models/ProposalMessage';

const mockOneIdentity = {
  login: jest.fn(),
  getProposal: jest.fn(),
  getOrCreatePersons: jest.fn(),
  createProposal: jest.fn(),
  connectPersonToProposal: jest.fn(),
  getProposalPersonConnections: jest.fn(),
  removeConnectionBetweenPersonAndProposal: jest.fn(),
  logout: jest.fn(),
};

describe('OneIdentityIntegrationQueueConsumer', () => {
  let consumer: OneIdentityIntegrationQueueConsumer;

  beforeEach(() => {
    consumer = new OneIdentityIntegrationQueueConsumer({} as MessageBroker);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onMessage', () => {
    describe('PROPOSAL_ACCEPTED', () => {
      it('should handle accepted proposal', async () => {
        const proposalMessage = {
          shortCode: 'shortCode',
          members: [
            { oidcSub: 'person1-oidcsub' },
            { oidcSub: 'person2-oidcsub' },
          ],
        } as ProposalMessageData;

        mockOneIdentity.getProposal.mockResolvedValueOnce(undefined);
        mockOneIdentity.createProposal.mockResolvedValueOnce(
          'proposal-UID_ESET'
        );
        mockOneIdentity.getOrCreatePersons.mockResolvedValueOnce([
          'person1-uid',
          'person2-uid',
        ]);

        await consumer.onMessage(
          Event.PROPOSAL_ACCEPTED,
          proposalMessage,
          {} as MessageProperties
        );

        expect(mockOneIdentity.createProposal).toHaveBeenCalledWith(
          proposalMessage
        );
        expect(mockOneIdentity.connectPersonToProposal).toHaveBeenCalledTimes(
          2
        );
        expect(mockOneIdentity.connectPersonToProposal).toHaveBeenNthCalledWith(
          1,
          'proposal-UID_ESET',
          'person1-uid'
        );
        expect(mockOneIdentity.connectPersonToProposal).toHaveBeenNthCalledWith(
          2,
          'proposal-UID_ESET',
          'person2-uid'
        );
        expect(mockOneIdentity.logout).toHaveBeenCalled();
      });
    });

    describe('PROPOSAL_UPDATED', () => {
      it('should handle updated proposal', async () => {
        const proposalMessage = {
          shortCode: 'shortCode',
          members: [
            { oidcSub: 'person1-oidcsub' },
            { oidcSub: 'person2-oidcsub' },
          ],
        } as ProposalMessageData;

        mockOneIdentity.getProposal.mockResolvedValueOnce('proposal-UID_ESET');
        mockOneIdentity.getOrCreatePersons.mockResolvedValueOnce([
          'person1-uid',
          'person2-uid',
        ]);
        mockOneIdentity.getProposalPersonConnections.mockResolvedValueOnce([]);

        await consumer.onMessage(
          Event.PROPOSAL_UPDATED,
          proposalMessage,
          {} as MessageProperties
        );

        expect(
          mockOneIdentity.getProposalPersonConnections
        ).toHaveBeenCalledWith('proposal-UID_ESET');
        expect(
          mockOneIdentity.removeConnectionBetweenPersonAndProposal
        ).toHaveBeenCalledTimes(0);
        expect(mockOneIdentity.connectPersonToProposal).toHaveBeenCalledTimes(
          2
        );
        expect(mockOneIdentity.connectPersonToProposal).toHaveBeenNthCalledWith(
          1,
          'proposal-UID_ESET',
          'person1-uid'
        );
        expect(mockOneIdentity.connectPersonToProposal).toHaveBeenNthCalledWith(
          2,
          'proposal-UID_ESET',
          'person2-uid'
        );
        expect(mockOneIdentity.logout).toHaveBeenCalled();
      });
    });
  });

  // todo: add tests for error handling
});
