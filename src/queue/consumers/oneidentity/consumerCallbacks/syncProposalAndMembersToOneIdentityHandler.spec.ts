jest.mock('@user-office-software/duo-logger');
jest.mock('../utils/ESSOneIdentity', () => ({
  ESSOneIdentity: jest.fn().mockImplementation(() => mockOneIdentity),
}));

import { logger } from '@user-office-software/duo-logger';

import { syncProposalAndMembersToOneIdentityHandler } from './syncProposalAndMembersToOneIdentityHandler';
import { Event } from '../../../../models/Event';
import { ProposalMessageData } from '../../../../models/ProposalMessage';
import { ProposalUser } from '../../scicat/scicatProposal/dto';
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
  hasPersonSiteAccessToProposal: jest.fn(),
};

const setupMocks = (data: {
  getProposal: UID_ESet | undefined;
  getProposalPersonConnections?: PersonHasESET[];
  getPersons?: string[];
  hasPersonSiteAccessToProposalConfig?: { [key: string]: boolean };
}) => {
  mockOneIdentity.createProposal.mockResolvedValueOnce('proposal-UID_ESet');
  mockOneIdentity.getProposal.mockResolvedValueOnce(data.getProposal);
  mockOneIdentity.getProposalPersonConnections.mockResolvedValueOnce(
    data.getProposalPersonConnections ?? []
  );
  mockOneIdentity.getPersons.mockResolvedValue(
    data.getPersons ?? ['proposer-uid', 'member-uid', 'data-access-uid']
  );
  if (data.hasPersonSiteAccessToProposalConfig) {
    mockOneIdentity.hasPersonSiteAccessToProposal.mockImplementation(
      async (uidPerson: string, proposalUid: string) => {
        void proposalUid;

        return data.hasPersonSiteAccessToProposalConfig?.[uidPerson] ?? false;
      }
    );
  } else {
    mockOneIdentity.hasPersonSiteAccessToProposal.mockResolvedValue(false);
  }
};

const proposalMessage = {
  shortCode: 'shortCode',
  proposer: { oidcSub: 'proposer-oidc-sub' },
  members: [{ oidcSub: 'member-oidc-sub' }],
  dataAccessUsers: [{ oidcSub: 'data-access-oidc-sub' } as ProposalUser],
  visitors: [] as ProposalUser[],
} as ProposalMessageData;

describe('oneIdentityIntegrationHandler', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

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
      expect(mockOneIdentity.connectPersonToProposal).toHaveBeenCalledTimes(3);
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
      expect(mockOneIdentity.connectPersonToProposal).toHaveBeenNthCalledWith(
        3,
        'proposal-UID_ESet',
        'data-access-uid'
      );
      expect(logger.logError).not.toHaveBeenCalled();
      expect(logger.logInfo).toHaveBeenCalledWith('Connections updated', {
        uidESet: 'proposal-UID_ESet',
        uidPersons: ['proposer-uid', 'member-uid', 'data-access-uid'],
      });
      expect(mockOneIdentity.logout).toHaveBeenCalled();
    });

    it('should log error if some of the users are not found in One Identity', async () => {
      setupMocks({
        getProposal: undefined,
        getProposalPersonConnections: [],
        getPersons: ['proposer-oidc-sub'],
      });

      const promise = syncProposalAndMembersToOneIdentityHandler(
        proposalMessage,
        Event.PROPOSAL_ACCEPTED
      );

      await jest.runAllTimersAsync();
      await promise;

      expect(logger.logError).toHaveBeenCalledWith(
        'discoverOIMPersonsWithRetry: failed after max retries',
        expect.objectContaining({
          attempt: 4,
          maxRetries: 3,
          totalAttempts: 4,
          missingCentralAccounts: ['member-oidc-sub', 'data-access-oidc-sub'],
          foundCount: 1,
          expectedCount: 3,
        })
      );
    });

    it('should retry and eventually find all users after retries', async () => {
      setupMocks({
        getProposal: undefined,
        getProposalPersonConnections: [],
      });

      // First three attempts return incomplete results, fourth attempt returns all users
      mockOneIdentity.getPersons
        .mockResolvedValueOnce(['proposer-oidc-sub'])
        .mockResolvedValueOnce(['proposer-oidc-sub', 'member-oidc-sub'])
        .mockResolvedValueOnce(['proposer-oidc-sub', 'member-oidc-sub'])
        .mockResolvedValueOnce([
          'proposer-oidc-sub',
          'member-oidc-sub',
          'data-access-oidc-sub',
        ]);

      const promise = syncProposalAndMembersToOneIdentityHandler(
        proposalMessage,
        Event.PROPOSAL_ACCEPTED
      );

      await jest.runAllTimersAsync();
      await promise;

      expect(logger.logWarn).toHaveBeenNthCalledWith(
        1,
        'discoverOIMPersonsWithRetry: incomplete - retrying',
        expect.objectContaining({
          attempt: 1,
          foundCount: 1,
          expectedCount: 3,
        })
      );

      expect(logger.logWarn).toHaveBeenNthCalledWith(
        2,
        'discoverOIMPersonsWithRetry: incomplete - retrying',
        expect.objectContaining({
          attempt: 2,
          foundCount: 2,
          expectedCount: 3,
        })
      );

      expect(logger.logWarn).toHaveBeenNthCalledWith(
        3,
        'discoverOIMPersonsWithRetry: incomplete - retrying',
        expect.objectContaining({
          attempt: 3,
          delayMs: 60000,
          foundCount: 2,
          expectedCount: 3,
        })
      );

      // Verify success log on final attempt
      expect(logger.logInfo).toHaveBeenCalledWith(
        'discoverOIMPersonsWithRetry: success',
        expect.objectContaining({
          attempt: 4,
          foundCount: 3,
        })
      );

      // Verify all users are connected
      expect(mockOneIdentity.connectPersonToProposal).toHaveBeenCalledTimes(3);
    });

    it('should retry three times and fail if users are not found', async () => {
      setupMocks({
        getProposal: undefined,
        getProposalPersonConnections: [],
        getPersons: ['proposer-oidc-sub'],
      });

      const promise = syncProposalAndMembersToOneIdentityHandler(
        proposalMessage,
        Event.PROPOSAL_ACCEPTED
      );

      await jest.runAllTimersAsync();
      await promise;

      // Verify that getPersons was called 4 times (initial attempt plus 3 retries)
      expect(mockOneIdentity.getPersons).toHaveBeenCalledTimes(4);

      // Verify intermediate retry logs
      expect(logger.logWarn).toHaveBeenNthCalledWith(
        1,
        'discoverOIMPersonsWithRetry: incomplete - retrying',
        expect.objectContaining({
          attempt: 1,
          maxRetries: 3,
          missingCentralAccounts: ['member-oidc-sub', 'data-access-oidc-sub'],
          foundCount: 1,
          expectedCount: 3,
        })
      );

      expect(logger.logWarn).toHaveBeenNthCalledWith(
        2,
        'discoverOIMPersonsWithRetry: incomplete - retrying',
        expect.objectContaining({
          attempt: 2,
          maxRetries: 3,
          missingCentralAccounts: ['member-oidc-sub', 'data-access-oidc-sub'],
          foundCount: 1,
          expectedCount: 3,
        })
      );

      expect(logger.logWarn).toHaveBeenNthCalledWith(
        3,
        'discoverOIMPersonsWithRetry: incomplete - retrying',
        expect.objectContaining({
          attempt: 3,
          maxRetries: 3,
          delayMs: 60000,
          missingCentralAccounts: ['member-oidc-sub', 'data-access-oidc-sub'],
          foundCount: 1,
          expectedCount: 3,
        })
      );

      // Verify final error log after max retries exhausted
      expect(logger.logError).toHaveBeenCalledWith(
        'discoverOIMPersonsWithRetry: failed after max retries',
        expect.objectContaining({
          attempt: 4,
          maxRetries: 3,
          totalAttempts: 4,
          missingCentralAccounts: ['member-oidc-sub', 'data-access-oidc-sub'],
          foundCount: 1,
          expectedCount: 3,
        })
      );

      // Verify connections are still attempted with partial results
      expect(mockOneIdentity.connectPersonToProposal).toHaveBeenCalledTimes(1);
      expect(mockOneIdentity.connectPersonToProposal).toHaveBeenCalledWith(
        'proposal-UID_ESet',
        'proposer-oidc-sub'
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
          2
        );
        expect(mockOneIdentity.connectPersonToProposal).toHaveBeenCalledWith(
          'proposal-UID_ESet',
          'member-uid'
        );
        expect(mockOneIdentity.connectPersonToProposal).toHaveBeenCalledWith(
          'proposal-UID_ESet',
          'data-access-uid'
        );
        expect(
          mockOneIdentity.removeConnectionBetweenPersonAndProposal
        ).not.toHaveBeenCalled();
        expect(logger.logInfo).toHaveBeenCalledWith('Connections updated', {
          uidESet: 'proposal-UID_ESet',
          uidPersons: ['proposer-uid', 'member-uid', 'data-access-uid'],
        });
        expect(mockOneIdentity.logout).toHaveBeenCalled();
      });
    });
  });

  describe('PROPOSAL_UPDATED', () => {
    it('should handle updated proposal and remove old connections', async () => {
      setupMocks({
        getProposal: 'proposal-UID_ESet',
        getProposalPersonConnections: [
          {
            UID_ESet: 'proposal-UID_ESet',
            UID_Person: 'proposer-uid',
          },
          {
            UID_ESet: 'proposal-UID_ESet',
            UID_Person: 'old-member-uid', // this person should be removed
          },
        ],
        hasPersonSiteAccessToProposalConfig: { 'old-member-uid': false },
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
      expect(mockOneIdentity.connectPersonToProposal).toHaveBeenCalledTimes(2);
      expect(mockOneIdentity.connectPersonToProposal).toHaveBeenCalledWith(
        'proposal-UID_ESet',
        'member-uid'
      );
      expect(mockOneIdentity.connectPersonToProposal).toHaveBeenCalledWith(
        'proposal-UID_ESet',
        'data-access-uid'
      );
      expect(logger.logInfo).toHaveBeenCalledWith('Connections updated', {
        uidESet: 'proposal-UID_ESet',
        uidPersons: ['proposer-uid', 'member-uid', 'data-access-uid'],
      });
      expect(mockOneIdentity.logout).toHaveBeenCalled();
    });

    it('should not remove old connection if person has site access to proposal', async () => {
      setupMocks({
        getProposal: 'proposal-UID_ESet',
        getProposalPersonConnections: [
          {
            UID_ESet: 'proposal-UID_ESet',
            UID_Person: 'proposer-uid',
          },
          {
            UID_ESet: 'proposal-UID_ESet',
            UID_Person: 'visitor-member-uid', // this person should NOT be removed due to site access
          },
        ],
        // 'visitor-member-uid' has site access
        hasPersonSiteAccessToProposalConfig: { 'visitor-member-uid': true },
      });

      await syncProposalAndMembersToOneIdentityHandler(
        proposalMessage,
        Event.PROPOSAL_UPDATED
      );

      expect(mockOneIdentity.createProposal).not.toHaveBeenCalled();
      expect(mockOneIdentity.getProposalPersonConnections).toHaveBeenCalledWith(
        'proposal-UID_ESet'
      );
      // removeConnectionBetweenPersonAndProposal should NOT be called for 'visitor-member-uid'
      expect(
        mockOneIdentity.removeConnectionBetweenPersonAndProposal
      ).not.toHaveBeenCalledWith('proposal-UID_ESet', 'visitor-member-uid');
      expect(
        mockOneIdentity.removeConnectionBetweenPersonAndProposal
      ).toHaveBeenCalledTimes(0); // No connections should be removed in this specific setup

      expect(mockOneIdentity.connectPersonToProposal).toHaveBeenCalledTimes(2);
      expect(mockOneIdentity.connectPersonToProposal).toHaveBeenCalledWith(
        'proposal-UID_ESet',
        'member-uid'
      );
      expect(mockOneIdentity.connectPersonToProposal).toHaveBeenCalledWith(
        'proposal-UID_ESet',
        'data-access-uid'
      );
      expect(logger.logInfo).toHaveBeenCalledWith('Connections updated', {
        uidESet: 'proposal-UID_ESet',
        uidPersons: ['proposer-uid', 'member-uid', 'data-access-uid'],
      });
      expect(mockOneIdentity.logout).toHaveBeenCalled();
    });

    it('should keep visitor connections when the visitor is still on the proposal', async () => {
      const proposalMessageWithVisitor = {
        ...proposalMessage,
        visitors: [{ oidcSub: 'visitor-oidc-sub' } as ProposalUser],
      } as ProposalMessageData;

      setupMocks({
        getProposal: 'proposal-UID_ESet',
        getProposalPersonConnections: [
          {
            UID_ESet: 'proposal-UID_ESet',
            UID_Person: 'proposer-uid',
          },
          {
            UID_ESet: 'proposal-UID_ESet',
            UID_Person: 'visitor-uid',
          },
        ],
        getPersons: [
          'proposer-uid',
          'member-uid',
          'data-access-uid',
          'visitor-uid',
        ],
      });

      await syncProposalAndMembersToOneIdentityHandler(
        proposalMessageWithVisitor,
        Event.PROPOSAL_UPDATED
      );

      expect(
        mockOneIdentity.removeConnectionBetweenPersonAndProposal
      ).not.toHaveBeenCalledWith('proposal-UID_ESet', 'visitor-uid');
      expect(mockOneIdentity.connectPersonToProposal).toHaveBeenCalledTimes(2);
      expect(mockOneIdentity.connectPersonToProposal).toHaveBeenCalledWith(
        'proposal-UID_ESet',
        'member-uid'
      );
      expect(mockOneIdentity.connectPersonToProposal).toHaveBeenCalledWith(
        'proposal-UID_ESet',
        'data-access-uid'
      );
      expect(logger.logInfo).toHaveBeenCalledWith('Connections updated', {
        uidESet: 'proposal-UID_ESet',
        uidPersons: [
          'proposer-uid',
          'member-uid',
          'data-access-uid',
          'visitor-uid',
        ],
      });
    });

    it('should remove one old connection and keep another due to site access', async () => {
      setupMocks({
        getProposal: 'proposal-UID_ESet',
        getProposalPersonConnections: [
          {
            UID_ESet: 'proposal-UID_ESet',
            UID_Person: 'proposer-uid', // Keep (in proposal)
          },
          {
            UID_ESet: 'proposal-UID_ESet',
            UID_Person: 'old-member-to-remove-uid', // Remove (not in proposal, no site access)
          },
          {
            UID_ESet: 'proposal-UID_ESet',
            UID_Person: 'visitor-member-to-keep-uid', // Keep (not in proposal, but has site access)
          },
        ],
        getPersons: ['proposer-uid', 'member-uid', 'data-access-uid'], // Current members in the proposal message
        hasPersonSiteAccessToProposalConfig: {
          'old-member-to-remove-uid': false,
          'visitor-member-to-keep-uid': true,
        },
      });

      await syncProposalAndMembersToOneIdentityHandler(
        proposalMessage,
        Event.PROPOSAL_UPDATED
      );

      expect(mockOneIdentity.createProposal).not.toHaveBeenCalled();
      expect(mockOneIdentity.getProposalPersonConnections).toHaveBeenCalledWith(
        'proposal-UID_ESet'
      );

      // Check removals
      expect(
        mockOneIdentity.removeConnectionBetweenPersonAndProposal
      ).toHaveBeenCalledTimes(1);
      expect(
        mockOneIdentity.removeConnectionBetweenPersonAndProposal
      ).toHaveBeenCalledWith('proposal-UID_ESet', 'old-member-to-remove-uid');
      expect(
        mockOneIdentity.removeConnectionBetweenPersonAndProposal
      ).not.toHaveBeenCalledWith(
        'proposal-UID_ESet',
        'visitor-member-to-keep-uid'
      );

      // Check additions
      // 'member-uid' is in proposalMessage.members and not in initial connections that are kept
      expect(mockOneIdentity.connectPersonToProposal).toHaveBeenCalledTimes(2);
      expect(mockOneIdentity.connectPersonToProposal).toHaveBeenCalledWith(
        'proposal-UID_ESet',
        'member-uid'
      );
      expect(mockOneIdentity.connectPersonToProposal).toHaveBeenCalledWith(
        'proposal-UID_ESet',
        'data-access-uid'
      );

      expect(logger.logInfo).toHaveBeenCalledWith('Connections updated', {
        uidESet: 'proposal-UID_ESet',
        uidPersons: ['proposer-uid', 'member-uid', 'data-access-uid'],
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
