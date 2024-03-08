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
import { ESSOneIdentity } from './utils/ESSOneIdentity';
import { Event } from '../../../models/Event';
import { ProposalMessageData } from '../../../models/ProposalMessage';

const mockOneIdentity: jest.Mocked<Omit<ESSOneIdentity, 'oneIdentityApi'>> = {
  login: jest.fn(),
  logout: jest.fn(),
  getProposal: jest.fn(),
  getPerson: jest.fn(),
  getPersons: jest.fn(),
  createProposal: jest.fn(),
  connectPersonToProposal: jest.fn(),
  getProposalPersonConnections: jest.fn(),
  removeConnectionBetweenPersonAndProposal: jest.fn(),
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
          proposer: { email: 'proposer@email' },
          members: [{ email: 'member1@email' }],
        } as ProposalMessageData;

        mockOneIdentity.getProposal.mockResolvedValueOnce(undefined);
        mockOneIdentity.createProposal.mockResolvedValueOnce(
          'proposal-UID_ESET'
        );
        mockOneIdentity.getPersons.mockResolvedValueOnce([
          {
            email: 'proposer@email',
            uidPerson: 'proposer-uid',
          },
          {
            email: 'member1@email',
            uidPerson: 'member1-uid',
          },
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
          'proposer-uid'
        );
        expect(mockOneIdentity.connectPersonToProposal).toHaveBeenNthCalledWith(
          2,
          'proposal-UID_ESET',
          'member1-uid'
        );
        expect(mockOneIdentity.logout).toHaveBeenCalled();
      });

      it('should not create proposal and manage connections if proposal already exists', async () => {
        const proposalMessage = {
          shortCode: 'shortCode',
          proposer: { email: 'proposer@email' },
          members: [{ email: 'member1@email' }, { email: 'member2@email' }],
        } as ProposalMessageData;

        mockOneIdentity.getProposal.mockResolvedValueOnce('proposal-UID_ESET');

        await consumer.onMessage(
          Event.PROPOSAL_ACCEPTED,
          proposalMessage,
          {} as MessageProperties
        );

        expect(mockOneIdentity.createProposal).not.toHaveBeenCalled();
        expect(mockOneIdentity.connectPersonToProposal).not.toHaveBeenCalled();
        expect(
          mockOneIdentity.removeConnectionBetweenPersonAndProposal
        ).not.toHaveBeenCalled();
        expect(mockOneIdentity.logout).toHaveBeenCalled();
      });
    });

    describe('PROPOSAL_UPDATED', () => {
      it('should handle updated proposal', async () => {
        const proposalMessage = {
          shortCode: 'shortCode',
          proposer: { email: 'proposer@email' },
          members: [{ email: 'new-member@email' }], // this person should be added
        } as ProposalMessageData;

        mockOneIdentity.getProposal.mockResolvedValueOnce('proposal-UID_ESET');
        mockOneIdentity.getPersons.mockResolvedValueOnce([
          {
            email: 'proposer@email',
            uidPerson: 'proposer-uid',
          },
          {
            email: 'new-member@email',
            uidPerson: 'new-member-uid',
          },
        ]);
        mockOneIdentity.getProposalPersonConnections.mockResolvedValueOnce([
          {
            UID_ESet: 'proposal-UID_ESET',
            UID_Person: 'proposer-uid',
          },
          {
            UID_ESet: 'proposal-UID_ESET',
            UID_Person: 'old-member-uid', // this person should be removed, because it's not in the updated proposal
          },
        ]);

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
        ).toHaveBeenCalledTimes(1);
        expect(
          mockOneIdentity.removeConnectionBetweenPersonAndProposal
        ).toHaveBeenCalledWith('proposal-UID_ESET', 'old-member-uid');
        expect(mockOneIdentity.connectPersonToProposal).toHaveBeenCalledTimes(
          1
        );
        expect(mockOneIdentity.connectPersonToProposal).toHaveBeenCalledWith(
          'proposal-UID_ESET',
          'new-member-uid'
        );
        expect(mockOneIdentity.logout).toHaveBeenCalled();
      });
    });
  });
});
