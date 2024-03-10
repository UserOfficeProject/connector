jest.mock('../utils/ESSOneIdentity', () => ({
  ESSOneIdentity: jest.fn().mockImplementation(() => mockOneIdentity),
}));

import { oneIdentityIntegrationHandler } from './oneIdentityIntegrationHandler';
import { Event } from '../../../../models/Event';
import { ProposalMessageData } from '../../../../models/ProposalMessage';
import {
  ESSOneIdentity,
  PersonHasESETValues,
  UID_ESet,
} from '../utils/ESSOneIdentity';

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

const setupMocks = (data: {
  getProposal: UID_ESet | undefined;
  getProposalPersonConnections?: PersonHasESETValues[];
}) => {
  mockOneIdentity.createProposal.mockResolvedValueOnce('proposal-UID_ESet');
  mockOneIdentity.getProposal.mockResolvedValueOnce(data.getProposal);
  mockOneIdentity.getProposalPersonConnections.mockResolvedValueOnce(
    data.getProposalPersonConnections ?? []
  );
  mockOneIdentity.getPersons.mockResolvedValueOnce([
    {
      email: 'proposer@email',
      uidPerson: 'proposer-uid',
    },
    {
      email: 'member@email',
      uidPerson: 'member-uid',
    },
  ]);
};

const proposalMessage = {
  shortCode: 'shortCode',
  proposer: { email: 'proposer@email' },
  members: [{ email: 'member@email' }],
} as ProposalMessageData;

describe('oneIdentityIntegrationHandler', () => {
  describe('PROPOSAL_ACCEPTED', () => {
    it('should handle accepted proposal', async () => {
      setupMocks({
        getProposal: undefined,
        getProposalPersonConnections: [],
      });

      await oneIdentityIntegrationHandler(
        proposalMessage,
        Event.PROPOSAL_ACCEPTED
      );

      expect(mockOneIdentity.createProposal).toHaveBeenCalledWith(
        proposalMessage
      );
      expect(mockOneIdentity.getProposalPersonConnections).toHaveBeenCalledWith(
        'proposal-UID_ESet'
      );
      expect(
        mockOneIdentity.removeConnectionBetweenPersonAndProposal
      ).toHaveBeenCalledTimes(0);
      expect(mockOneIdentity.connectPersonToProposal).toHaveBeenCalledTimes(2);
      expect(mockOneIdentity.connectPersonToProposal).toHaveBeenNthCalledWith(
        1,
        'proposal-UID_ESet',
        'proposer-uid'
      );
      expect(mockOneIdentity.connectPersonToProposal).toHaveBeenNthCalledWith(
        2,
        'proposal-UID_ESet',
        'member-uid'
      );
      expect(mockOneIdentity.logout).toHaveBeenCalled();
    });

    describe('when proposal already exists in One Identity (Retry logic)', () => {
      it('should not create proposal but handle connections if proposal exists', async () => {
        setupMocks({
          getProposal: 'proposal-UID_ESet',
          getProposalPersonConnections: [
            {
              UID_ESet: 'proposal-UID_ESet',
              UID_Person: 'proposer-uid',
            },
          ],
        });

        await oneIdentityIntegrationHandler(
          proposalMessage,
          Event.PROPOSAL_ACCEPTED
        );

        expect(mockOneIdentity.createProposal).not.toHaveBeenCalled();
        expect(mockOneIdentity.connectPersonToProposal).toHaveBeenCalledTimes(
          1
        );
        expect(mockOneIdentity.connectPersonToProposal).toHaveBeenCalledWith(
          'proposal-UID_ESet',
          'member-uid'
        );
        expect(
          mockOneIdentity.removeConnectionBetweenPersonAndProposal
        ).not.toHaveBeenCalled();
        expect(mockOneIdentity.logout).toHaveBeenCalled();
      });
    });
  });

  describe('PROPOSAL_UPDATED', () => {
    it('should handle updated proposal', async () => {
      setupMocks({
        getProposal: 'proposal-UID_ESet',
        getProposalPersonConnections: [
          {
            UID_ESet: 'proposal-UID_ESet',
            UID_Person: 'proposer-uid',
          },
          {
            UID_ESet: 'proposal-UID_ESet',
            UID_Person: 'old-member-uid', // this person should be removed, because it's not in the updated proposal
          },
        ],
      });

      await oneIdentityIntegrationHandler(
        proposalMessage,
        Event.PROPOSAL_UPDATED
      );

      expect(mockOneIdentity.createProposal).not.toHaveBeenCalled();
      expect(mockOneIdentity.getProposalPersonConnections).toHaveBeenCalledWith(
        'proposal-UID_ESet'
      );
      expect(
        mockOneIdentity.removeConnectionBetweenPersonAndProposal
      ).toHaveBeenCalledTimes(1);
      expect(
        mockOneIdentity.removeConnectionBetweenPersonAndProposal
      ).toHaveBeenCalledWith('proposal-UID_ESet', 'old-member-uid');
      expect(mockOneIdentity.connectPersonToProposal).toHaveBeenCalledTimes(1);
      expect(mockOneIdentity.connectPersonToProposal).toHaveBeenCalledWith(
        'proposal-UID_ESet',
        'member-uid'
      );
      expect(mockOneIdentity.logout).toHaveBeenCalled();
    });

    it('should not handle proposal if there is no created proposal in One Identity', async () => {
      setupMocks({
        getProposal: undefined,
      });

      await oneIdentityIntegrationHandler(
        proposalMessage,
        Event.PROPOSAL_UPDATED
      );

      expect(mockOneIdentity.createProposal).not.toHaveBeenCalled();
      expect(
        mockOneIdentity.getProposalPersonConnections
      ).not.toHaveBeenCalled();
      expect(
        mockOneIdentity.removeConnectionBetweenPersonAndProposal
      ).not.toHaveBeenCalled();
      expect(mockOneIdentity.connectPersonToProposal).not.toHaveBeenCalled();
      expect(mockOneIdentity.logout).toHaveBeenCalled();
    });
  });
});
