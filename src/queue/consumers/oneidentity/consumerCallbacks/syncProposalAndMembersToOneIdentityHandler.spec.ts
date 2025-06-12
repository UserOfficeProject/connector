jest.mock('@user-office-software/duo-logger');
jest.mock('../utils/ESSOneIdentity', () => ({
  ESSOneIdentity: jest.fn().mockImplementation(() => mockOneIdentity),
}));

import { logger } from '@user-office-software/duo-logger';

import { syncProposalAndMembersToOneIdentityHandler } from './syncProposalAndMembersToOneIdentityHandler';
import { Event } from '../../../../models/Event';
import { ProposalMessageData } from '../../../../models/ProposalMessage';
import { ESSOneIdentity } from '../utils/ESSOneIdentity';
import { UID_ESet } from '../utils/interfaces/Eset';
import { PersonHasESET } from '../utils/interfaces/PersonHasESET';

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
  getPersonWantsOrg: jest.fn(),
  createPersonWantsOrg: jest.fn(),
  cancelPersonWantsOrg: jest.fn(),
};

const setupMocks = (data: {
  getProposal: UID_ESet | undefined;
  getProposalPersonConnections?: PersonHasESET[];
  getPersons?: string[];
}) => {
  mockOneIdentity.createProposal.mockResolvedValueOnce('proposal-UID_ESet');
  mockOneIdentity.getProposal.mockResolvedValueOnce(data.getProposal);
  mockOneIdentity.getProposalPersonConnections.mockResolvedValueOnce(
    data.getProposalPersonConnections ?? []
  );
  mockOneIdentity.getPersons.mockResolvedValueOnce(
    data.getPersons ?? ['proposer-uid', 'member-uid']
  );
};

const proposalMessage = {
  shortCode: 'shortCode',
  proposer: { oidcSub: 'proposer-oidc-sub' },
  members: [{ oidcSub: 'member-oidc-sub' }],
} as ProposalMessageData;

describe('oneIdentityIntegrationHandler', () => {
  describe('PROPOSAL_ACCEPTED', () => {
    it('should handle accepted proposal', async () => {
      setupMocks({
        getProposal: undefined,
        getProposalPersonConnections: [],
      });

      await syncProposalAndMembersToOneIdentityHandler(
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
      expect(logger.logError).not.toHaveBeenCalled();
      expect(logger.logInfo).toHaveBeenCalledWith('Connections updated', {
        uidESet: 'proposal-UID_ESet',
        uidPersons: ['proposer-uid', 'member-uid'],
      });
      expect(mockOneIdentity.logout).toHaveBeenCalled();
    });

    it('should log error if some of the users are not found in One Identity', async () => {
      setupMocks({
        getProposal: undefined,
        getProposalPersonConnections: [],
        getPersons: ['proposer-uid'],
      });

      await syncProposalAndMembersToOneIdentityHandler(
        proposalMessage,
        Event.PROPOSAL_ACCEPTED
      );

      expect(logger.logError).toHaveBeenCalledWith(
        'Not all users found in One Identity (Investigate). Missing central accounts:',
        {
          allCentralAccounts: ['member-oidc-sub', 'proposer-oidc-sub'],
          foundUsersInOneIdentity: ['proposer-uid'],
          missingCentralAccounts: ['member-oidc-sub', 'proposer-oidc-sub'],
          totalUsersInput: 2,
        }
      );
    });

    it('should throw error if proposal creation fails', async () => {
      // Set up mocks with getProposal returning undefined (proposal doesn't exist)
      mockOneIdentity.getProposal.mockResolvedValueOnce(undefined);

      // Mock createProposal to return undefined (creation failed)
      mockOneIdentity.createProposal.mockResolvedValueOnce(undefined);

      // Expect the handler to throw an error
      await expect(
        syncProposalAndMembersToOneIdentityHandler(
          proposalMessage,
          Event.PROPOSAL_ACCEPTED
        )
      ).rejects.toThrow('Proposal creation failed in ESS One Identity');

      // Verify that logout is still called (in the finally block)
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

        await syncProposalAndMembersToOneIdentityHandler(
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
        expect(logger.logInfo).toHaveBeenCalledWith('Connections updated', {
          uidESet: 'proposal-UID_ESet',
          uidPersons: ['proposer-uid', 'member-uid'],
        });
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

      await syncProposalAndMembersToOneIdentityHandler(
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
      expect(logger.logInfo).toHaveBeenCalledWith('Connections updated', {
        uidESet: 'proposal-UID_ESet',
        uidPersons: ['proposer-uid', 'member-uid'],
      });
      expect(mockOneIdentity.logout).toHaveBeenCalled();
    });

    it('should not handle proposal if there is no created proposal in One Identity', async () => {
      setupMocks({
        getProposal: undefined,
      });

      await syncProposalAndMembersToOneIdentityHandler(
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
      expect(logger.logInfo).toHaveBeenCalledWith('Proposal in One Identity', {
        uidESet: undefined,
      });
      expect(mockOneIdentity.logout).toHaveBeenCalled();
    });
  });
});
