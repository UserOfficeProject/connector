jest.mock('@user-office-software/duo-logger');
jest.mock('../utils/ESSOneIdentity', () => ({
  ESSOneIdentity: jest.fn().mockImplementation(() => mockOneIdentity),
}));

const ONE_IDENTITY_SYSTEM_ACCESS_LASTS_FOR_DAYS = '45';

jest.mock('process', () => ({
  env: {
    ONE_IDENTITY_SYSTEM_ACCESS_LASTS_FOR_DAYS,
  },
}));

import { logger } from '@user-office-software/duo-logger';

import { syncVisitToOneIdentityHandler } from './syncVisitToOneIdentityHandler';
import { Event } from '../../../../models/Event';
import { ProposalMessageData } from '../../../../models/ProposalMessage';
import { ESSOneIdentity } from '../utils/ESSOneIdentity';
import { UID_ESet } from '../utils/interfaces/Eset';
import { IdentityType, Person } from '../utils/interfaces/Person';
import {
  OrderState,
  PersonWantsOrg,
  PersonWantsOrgRole,
} from '../utils/interfaces/PersonWantsOrg';
import { VisitMessage } from '../utils/interfaces/VisitMessage';

const mockOneIdentity: jest.Mocked<Omit<ESSOneIdentity, 'oneIdentityApi'>> = {
  login: jest.fn(),
  logout: jest.fn(),
  getPerson: jest.fn(),
  getPersons: jest.fn(),
  getPersonWantsOrg: jest.fn(),
  getProposal: jest.fn(),
  createProposal: jest.fn(),
  connectPersonToProposal: jest.fn(),
  getProposalPersonConnections: jest.fn(),
  removeConnectionBetweenPersonAndProposal: jest.fn(),
  createPersonWantsOrg: jest.fn(),
  cancelPersonWantsOrg: jest.fn(),
  hasPersonSiteAccessToProposal: jest.fn(),
};

const mockUidESet: UID_ESet = 'eset-uid-123';

const visitMessage: VisitMessage = {
  visitorId: 'visitor-oidc-sub',
  startAt: '2023-01-01T00:00:00.000Z',
  endAt: '2023-01-10T00:00:00.000Z',
  proposal: {
    shortCode: 'proposal-short-code',
    members: [
      { oidcSub: 'member-oidc-sub' },
      { oidcSub: 'visitor-oidc-sub' }, // Visitor is also a member
    ],
  } as ProposalMessageData,
};

const visitMessageVisitorNotMember: VisitMessage = {
  ...visitMessage,
  proposal: {
    ...visitMessage.proposal,
    members: [{ oidcSub: 'member-oidc-sub' }], // Visitor is NOT a member
  } as ProposalMessageData,
};

describe('syncVisitToOneIdentityHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Science user verification', () => {
    it('should skip processing if visitor is not a science user', async () => {
      // Mock person that is not a science user
      const mockPerson = {
        UID_Person: 'visitor-uid',
        CCC_EmployeeSubType: 'EMPLOYEEDK',
      } as Person;

      mockOneIdentity.getPerson.mockResolvedValueOnce(mockPerson);

      await syncVisitToOneIdentityHandler(visitMessage, Event.VISIT_CREATED);

      expect(mockOneIdentity.login).toHaveBeenCalled();
      expect(mockOneIdentity.getPerson).toHaveBeenCalledWith(
        'visitor-oidc-sub'
      );
      expect(logger.logInfo).toHaveBeenCalledWith(
        'Visitor is not a Science User, skipping',
        {}
      );
      expect(mockOneIdentity.createPersonWantsOrg).not.toHaveBeenCalled();
      expect(mockOneIdentity.logout).toHaveBeenCalled();
    });
  });

  describe('VISIT_CREATED', () => {
    it('should create site access and system access in One Identity for science users and connect to proposal', async () => {
      // Mock the current time to a fixed value for testing
      const mockNowDate = new Date('2022-12-15T00:00:00.000Z');
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => mockNowDate.getTime());

      // Mock person that is a science user
      const mockPerson = {
        UID_Person: 'visitor-uid',
        CCC_EmployeeSubType: IdentityType.ESSSCIENCEUSER,
      } as Person;

      // Mock site access and system access creation responses
      const mockSiteAccess = {
        UID_PersonWantsOrg: 'site-access-uid',
      } as PersonWantsOrg;
      const mockSystemAccess = {
        UID_PersonWantsOrg: 'system-access-uid',
      } as PersonWantsOrg;

      mockOneIdentity.getPerson.mockResolvedValueOnce(mockPerson);
      mockOneIdentity.getProposal.mockResolvedValueOnce(mockUidESet);
      mockOneIdentity.getProposalPersonConnections.mockResolvedValueOnce([]); // No existing connection

      // Mock sequential calls to createPersonWantsOrg with different responses
      mockOneIdentity.createPersonWantsOrg
        .mockResolvedValueOnce([mockSiteAccess])
        .mockResolvedValueOnce([mockSystemAccess]);

      await syncVisitToOneIdentityHandler(visitMessage, Event.VISIT_CREATED);

      expect(mockOneIdentity.login).toHaveBeenCalled();
      expect(mockOneIdentity.getPerson).toHaveBeenCalledWith(
        'visitor-oidc-sub'
      );
      expect(mockOneIdentity.getProposal).toHaveBeenCalledWith(
        visitMessage.proposal
      );
      expect(mockOneIdentity.getProposalPersonConnections).toHaveBeenCalledWith(
        mockUidESet
      );

      // Verify site access creation
      expect(mockOneIdentity.createPersonWantsOrg).toHaveBeenCalledTimes(2);
      expect(mockOneIdentity.createPersonWantsOrg).toHaveBeenNthCalledWith(
        1,
        PersonWantsOrgRole.SITE_ACCESS,
        visitMessage.visitorId,
        visitMessage.startAt,
        visitMessage.endAt,
        visitMessage.proposal.shortCode
      );

      // Calculate expected system access dates
      // validFrom should be the current mock date
      const expectedValidFrom = mockNowDate.toISOString();
      const expectedEndDate = new Date(visitMessage.endAt);
      expectedEndDate.setDate(
        expectedEndDate.getDate() +
          parseInt(ONE_IDENTITY_SYSTEM_ACCESS_LASTS_FOR_DAYS)
      );

      // Verify system access creation
      expect(mockOneIdentity.createPersonWantsOrg).toHaveBeenNthCalledWith(
        2,
        PersonWantsOrgRole.SYSTEM_ACCESS,
        visitMessage.visitorId,
        expectedValidFrom,
        expectedEndDate.toISOString(),
        'site-access-uid'
      );

      expect(logger.logInfo).toHaveBeenCalledWith(
        'Site access created in One Identity',
        {
          UID_PersonWantsOrg: 'site-access-uid',
        }
      );
      expect(logger.logInfo).toHaveBeenCalledWith(
        'System access created in One Identity',
        {
          UID_PersonWantsOrg: 'system-access-uid',
        }
      );

      expect(mockOneIdentity.connectPersonToProposal).toHaveBeenCalledWith(
        mockUidESet,
        mockPerson.UID_Person
      );
      expect(logger.logInfo).toHaveBeenCalledWith(
        'Connection created between proposal and visitor',
        {
          uidPerson: mockPerson.UID_Person,
          uidESet: mockUidESet,
        }
      );

      expect(mockOneIdentity.logout).toHaveBeenCalled();

      // Restore original Date.now
      Date.now = originalDateNow;
    });

    it('should skip creating proposal connection if it already exists', async () => {
      const mockPerson = {
        UID_Person: 'visitor-uid',
        CCC_EmployeeSubType: IdentityType.ESSSCIENCEUSER,
      } as Person;
      const mockSiteAccess = {
        UID_PersonWantsOrg: 'site-access-uid',
      } as PersonWantsOrg;
      const mockSystemAccess = {
        UID_PersonWantsOrg: 'system-access-uid',
      } as PersonWantsOrg;

      mockOneIdentity.getPerson.mockResolvedValueOnce(mockPerson);
      mockOneIdentity.getProposal.mockResolvedValueOnce(mockUidESet);
      mockOneIdentity.getProposalPersonConnections.mockResolvedValueOnce([
        { UID_Person: mockPerson.UID_Person, UID_ESet: mockUidESet },
      ]); // Connection exists
      mockOneIdentity.createPersonWantsOrg
        .mockResolvedValueOnce([mockSiteAccess])
        .mockResolvedValueOnce([mockSystemAccess]);

      await syncVisitToOneIdentityHandler(visitMessage, Event.VISIT_CREATED);

      expect(mockOneIdentity.connectPersonToProposal).not.toHaveBeenCalled();
      expect(logger.logInfo).toHaveBeenCalledWith(
        'Connection already exists, skipping',
        {
          uidPerson: mockPerson.UID_Person,
          uidESet: mockUidESet,
        }
      );
      expect(mockOneIdentity.logout).toHaveBeenCalled();
    });

    it('should throw an error if proposal is not found in One Identity', async () => {
      const mockPerson = {
        UID_Person: 'visitor-uid',
        CCC_EmployeeSubType: IdentityType.ESSSCIENCEUSER,
      } as Person;

      mockOneIdentity.getPerson.mockResolvedValueOnce(mockPerson);
      mockOneIdentity.getProposal.mockResolvedValueOnce(undefined); // Proposal not found

      await expect(
        syncVisitToOneIdentityHandler(visitMessage, Event.VISIT_CREATED)
      ).rejects.toThrow(
        'Proposal not found in One Identity, cannot sync visit'
      );

      expect(mockOneIdentity.login).toHaveBeenCalled();
      expect(mockOneIdentity.getPerson).toHaveBeenCalledWith(
        'visitor-oidc-sub'
      );
      expect(mockOneIdentity.getProposal).toHaveBeenCalledWith(
        visitMessage.proposal
      );
      expect(mockOneIdentity.createPersonWantsOrg).not.toHaveBeenCalled();
      expect(mockOneIdentity.logout).toHaveBeenCalled();
    });

    it('should throw an error if site access creation fails', async () => {
      // Mock person that is a science user
      const mockPerson = {
        UID_Person: 'visitor-uid',
        CCC_EmployeeSubType: IdentityType.ESSSCIENCEUSER,
      } as Person;

      mockOneIdentity.getPerson.mockResolvedValueOnce(mockPerson);
      mockOneIdentity.getProposal.mockResolvedValueOnce(mockUidESet);
      mockOneIdentity.createPersonWantsOrg.mockRejectedValueOnce(
        new Error('Failed to create site access')
      );

      await expect(
        syncVisitToOneIdentityHandler(visitMessage, Event.VISIT_CREATED)
      ).rejects.toThrow('Failed to create site access');

      expect(mockOneIdentity.login).toHaveBeenCalled();
      expect(mockOneIdentity.getPerson).toHaveBeenCalledWith(
        'visitor-oidc-sub'
      );
      expect(mockOneIdentity.logout).toHaveBeenCalled();
    });

    it('should throw an error when provided with an invalid date', async () => {
      // Mock person that is a science user
      const mockPerson = {
        UID_Person: 'visitor-uid',
        CCC_EmployeeSubType: IdentityType.ESSSCIENCEUSER,
      } as Person;

      mockOneIdentity.getPerson.mockResolvedValueOnce(mockPerson);
      mockOneIdentity.getProposal.mockResolvedValueOnce(mockUidESet);

      // Create a message with an invalid date
      const invalidVisitMessage: VisitMessage = {
        ...visitMessage,
        startAt: 'invalid-date',
      };

      await expect(
        syncVisitToOneIdentityHandler(invalidVisitMessage, Event.VISIT_CREATED)
      ).rejects.toThrow('Invalid date provided to toIsoString: invalid-date');

      expect(mockOneIdentity.login).toHaveBeenCalled();
      expect(mockOneIdentity.getPerson).toHaveBeenCalledWith(
        'visitor-oidc-sub'
      );
      expect(mockOneIdentity.createPersonWantsOrg).not.toHaveBeenCalled();
      expect(mockOneIdentity.logout).toHaveBeenCalled();
    });
  });

  describe('VISITOR_DELETED', () => {
    it('should remove visitor access and proposal connection in One Identity for science users (if not a member)', async () => {
      // Mock person that is a science user
      const mockPerson = {
        UID_Person: 'visitor-uid',
        CCC_EmployeeSubType: IdentityType.ESSSCIENCEUSER,
      } as Person;

      const mockPersonWantsOrgs = [
        {
          UID_PersonWantsOrg: 'site-access-uid',
          UID_PersonOrdered: 'visitor-uid',
          DisplayOrg: PersonWantsOrgRole.SITE_ACCESS,
          ValidFrom: '2023-01-01T00:00:00.000Z',
          ValidUntil: '2023-01-10T00:00:00.000Z',
          OrderState: OrderState.GRANTED,
        } as PersonWantsOrg,
        {
          UID_PersonWantsOrg: 'system-access-uid',
          UID_PersonOrdered: 'visitor-uid',
          DisplayOrg: PersonWantsOrgRole.SYSTEM_ACCESS,
          ValidFrom: '2023-01-01T00:00:00.000Z',
          ValidUntil: '2023-01-10T00:00:00.000Z',
          CustomProperty04: 'site-access-uid',
          OrderState: OrderState.GRANTED,
        } as PersonWantsOrg,
      ];

      mockOneIdentity.getPerson.mockResolvedValueOnce(mockPerson);
      mockOneIdentity.getProposal.mockResolvedValueOnce(mockUidESet);
      mockOneIdentity.getPersonWantsOrg.mockResolvedValueOnce(
        mockPersonWantsOrgs
      );

      await syncVisitToOneIdentityHandler(
        visitMessageVisitorNotMember, // Visitor is NOT a member
        Event.VISIT_DELETED
      );

      expect(mockOneIdentity.login).toHaveBeenCalled();

      expect(mockOneIdentity.getPerson).toHaveBeenCalledWith(
        visitMessageVisitorNotMember.visitorId
      );
      expect(mockOneIdentity.getProposal).toHaveBeenCalledWith(
        visitMessageVisitorNotMember.proposal
      );
      expect(mockOneIdentity.getPersonWantsOrg).toHaveBeenCalledWith(
        'visitor-uid'
      );

      expect(logger.logInfo).toHaveBeenCalledWith(
        'One Identity successfully logged in',
        {}
      );

      expect(mockOneIdentity.cancelPersonWantsOrg).toHaveBeenNthCalledWith(
        1,
        'site-access-uid'
      );

      expect(logger.logInfo).toHaveBeenCalledWith(
        'Site access cancelled in One Identity',
        {
          UID_PersonWantsOrg: 'site-access-uid',
        }
      );

      expect(mockOneIdentity.cancelPersonWantsOrg).toHaveBeenNthCalledWith(
        2,
        'system-access-uid'
      );

      expect(logger.logInfo).toHaveBeenCalledWith(
        'System access cancelled in One Identity',
        {
          UID_PersonWantsOrg: 'system-access-uid',
        }
      );

      expect(mockOneIdentity.cancelPersonWantsOrg).toHaveBeenCalledTimes(2);

      expect(
        mockOneIdentity.removeConnectionBetweenPersonAndProposal
      ).toHaveBeenCalledWith(mockUidESet, mockPerson.UID_Person);
      expect(logger.logInfo).toHaveBeenCalledWith(
        'Connection removed between proposal and visitor',
        {
          uidPerson: mockPerson.UID_Person,
          uidESet: mockUidESet,
        }
      );

      expect(mockOneIdentity.logout).toHaveBeenCalled();
      expect(logger.logInfo).toHaveBeenCalledWith(
        'One Identity successfully logged out',
        {}
      );
    });

    it('should skip removing proposal connection if visitor is a member of the proposal', async () => {
      const mockPerson = {
        UID_Person: 'visitor-uid',
        CCC_EmployeeSubType: IdentityType.ESSSCIENCEUSER,
      } as Person;
      const mockPersonWantsOrgs = [
        {
          UID_PersonWantsOrg: 'site-access-uid',
          UID_PersonOrdered: 'visitor-uid',
          DisplayOrg: PersonWantsOrgRole.SITE_ACCESS,
          ValidFrom: '2023-01-01T00:00:00.000Z',
          ValidUntil: '2023-01-10T00:00:00.000Z',
          OrderState: OrderState.GRANTED,
        } as PersonWantsOrg,
        {
          UID_PersonWantsOrg: 'system-access-uid',
          UID_PersonOrdered: 'visitor-uid',
          DisplayOrg: PersonWantsOrgRole.SYSTEM_ACCESS,
          ValidFrom: '2023-01-01T00:00:00.000Z',
          ValidUntil: '2023-01-10T00:00:00.000Z',
          CustomProperty04: 'site-access-uid',
          OrderState: OrderState.GRANTED,
        } as PersonWantsOrg,
      ];

      mockOneIdentity.getPerson.mockResolvedValueOnce(mockPerson);
      mockOneIdentity.getProposal.mockResolvedValueOnce(mockUidESet);
      mockOneIdentity.getPersonWantsOrg.mockResolvedValueOnce(
        mockPersonWantsOrgs
      );

      // Using original visitMessage where visitor IS a member
      await syncVisitToOneIdentityHandler(visitMessage, Event.VISIT_DELETED);

      expect(
        mockOneIdentity.removeConnectionBetweenPersonAndProposal
      ).not.toHaveBeenCalled();
      expect(logger.logInfo).toHaveBeenCalledWith(
        'Visitor is a member of the proposal, skipping connection removal',
        {
          uidPerson: mockPerson.UID_Person,
          uidESet: mockUidESet,
        }
      );
      expect(mockOneIdentity.logout).toHaveBeenCalled();
    });

    it('should throw an error if proposal is not found in One Identity on delete', async () => {
      const mockPerson = {
        UID_Person: 'visitor-uid',
        CCC_EmployeeSubType: IdentityType.ESSSCIENCEUSER,
      } as Person;

      mockOneIdentity.getPerson.mockResolvedValueOnce(mockPerson);
      mockOneIdentity.getProposal.mockResolvedValueOnce(undefined); // Proposal not found

      await expect(
        syncVisitToOneIdentityHandler(visitMessage, Event.VISIT_DELETED)
      ).rejects.toThrow(
        'Proposal not found in One Identity, cannot sync visit'
      );

      expect(mockOneIdentity.login).toHaveBeenCalled();
      expect(mockOneIdentity.getPerson).toHaveBeenCalledWith(
        'visitor-oidc-sub'
      );
      expect(mockOneIdentity.getProposal).toHaveBeenCalledWith(
        visitMessage.proposal
      );
      expect(mockOneIdentity.cancelPersonWantsOrg).not.toHaveBeenCalled();
      expect(mockOneIdentity.logout).toHaveBeenCalled();
    });

    it('should skip processing if visitor is not a science user', async () => {
      // Mock person that is not a science user
      const mockPerson = {
        UID_Person: 'visitor-uid',
        CCC_EmployeeSubType: 'EMPLOYEEDK',
      } as Person;

      mockOneIdentity.getPerson.mockResolvedValueOnce(mockPerson);

      await syncVisitToOneIdentityHandler(visitMessage, Event.VISIT_DELETED);

      expect(mockOneIdentity.login).toHaveBeenCalled();
      expect(mockOneIdentity.getPerson).toHaveBeenCalledWith(
        'visitor-oidc-sub'
      );
      expect(logger.logInfo).toHaveBeenCalledWith(
        'Visitor is not a Science User, skipping',
        {}
      );
      expect(mockOneIdentity.getPersonWantsOrg).not.toHaveBeenCalled();
      expect(mockOneIdentity.cancelPersonWantsOrg).not.toHaveBeenCalled();
      expect(mockOneIdentity.logout).toHaveBeenCalled();
    });

    it('should throw error if person not found', async () => {
      mockOneIdentity.getPerson.mockResolvedValueOnce(undefined);

      await expect(
        syncVisitToOneIdentityHandler(visitMessage, Event.VISIT_DELETED)
      ).rejects.toThrow('Person not found in One Identity');

      expect(mockOneIdentity.login).toHaveBeenCalled();
      expect(mockOneIdentity.getPerson).toHaveBeenCalledWith(
        'visitor-oidc-sub'
      );
      expect(mockOneIdentity.getPersonWantsOrg).not.toHaveBeenCalled();
      expect(mockOneIdentity.cancelPersonWantsOrg).not.toHaveBeenCalled();
      expect(mockOneIdentity.logout).toHaveBeenCalled();
    });

    it('should throw error if site access not found', async () => {
      const mockPerson = {
        UID_Person: 'visitor-uid',
        CCC_EmployeeSubType: IdentityType.ESSSCIENCEUSER,
      } as Person;
      const mockPersonWantsOrgs = [
        // No site access matching the dates
        {
          UID_PersonWantsOrg: 'site-access-uid',
          UID_PersonOrdered: 'visitor-uid',
          DisplayOrg: PersonWantsOrgRole.SITE_ACCESS,
          ValidFrom: '2023-01-02T00:00:00.000Z', // Different from message.startAt
          ValidUntil: '2023-01-10T00:00:00.000Z',
          OrderState: OrderState.GRANTED,
        } as PersonWantsOrg,
      ];

      mockOneIdentity.getPerson.mockResolvedValueOnce(mockPerson);
      mockOneIdentity.getProposal.mockResolvedValueOnce(mockUidESet);
      mockOneIdentity.getPersonWantsOrg.mockResolvedValueOnce(
        mockPersonWantsOrgs
      );

      await expect(
        syncVisitToOneIdentityHandler(visitMessage, Event.VISIT_DELETED)
      ).rejects.toThrow(
        'Site access not found in One Identity, cannot remove access'
      );

      expect(mockOneIdentity.login).toHaveBeenCalled();
      expect(mockOneIdentity.getPerson).toHaveBeenCalledWith(
        'visitor-oidc-sub'
      );
      expect(mockOneIdentity.logout).toHaveBeenCalled();
    });

    it('should throw error if system access not found', async () => {
      const mockPerson = {
        UID_Person: 'visitor-uid',
        CCC_EmployeeSubType: IdentityType.ESSSCIENCEUSER,
      } as Person;

      const mockPersonWantsOrgs = [
        {
          UID_PersonWantsOrg: 'site-access-uid',
          UID_PersonOrdered: 'visitor-uid',
          DisplayOrg: PersonWantsOrgRole.SITE_ACCESS,
          ValidFrom: visitMessage.startAt,
          ValidUntil: visitMessage.endAt,
          OrderState: OrderState.GRANTED,
        } as PersonWantsOrg,
        // No system access with CustomProperty04 matching site-access-uid
        {
          UID_PersonWantsOrg: 'system-access-uid',
          UID_PersonOrdered: 'visitor-uid',
          DisplayOrg: PersonWantsOrgRole.SYSTEM_ACCESS,
          ValidFrom: '2023-01-01T00:00:00.000Z',
          ValidUntil: '2023-01-10T00:00:00.000Z',
          CustomProperty04: 'different-site-access-uid',
          OrderState: OrderState.GRANTED,
        } as PersonWantsOrg,
      ];

      mockOneIdentity.getPerson.mockResolvedValueOnce(mockPerson);
      mockOneIdentity.getProposal.mockResolvedValueOnce(mockUidESet);
      mockOneIdentity.getPersonWantsOrg.mockResolvedValueOnce(
        mockPersonWantsOrgs
      );

      await expect(
        syncVisitToOneIdentityHandler(visitMessage, Event.VISIT_DELETED)
      ).rejects.toThrow(
        'System access not found in One Identity, cannot remove access'
      );

      expect(mockOneIdentity.login).toHaveBeenCalled();
      expect(mockOneIdentity.getPerson).toHaveBeenCalledWith(
        'visitor-oidc-sub'
      );
      expect(mockOneIdentity.cancelPersonWantsOrg).toHaveBeenCalledWith(
        'site-access-uid'
      );
      expect(logger.logInfo).toHaveBeenCalledWith(
        'Site access cancelled in One Identity',
        {
          UID_PersonWantsOrg: 'site-access-uid',
        }
      );
      expect(mockOneIdentity.logout).toHaveBeenCalled();
    });
  });
});
