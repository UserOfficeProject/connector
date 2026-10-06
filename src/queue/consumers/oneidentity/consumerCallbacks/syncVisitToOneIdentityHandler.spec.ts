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
  upsertPersonWantsOrg: jest.fn(),
  cancelPersonWantsOrg: jest.fn(),
  syncPEJAllowance: jest.fn(),
  hasPersonSiteAccessToProposal: jest.fn(),
};

const mockUidESet: UID_ESet = 'eset-uid-123';

const visitMessage: VisitMessage = {
  id: '1',
  visitorId: 'visitor-oidc-sub',
  startAt: '2023-01-01T00:00:00.000Z',
  endAt: '2023-01-10T00:00:00.000Z',
  proposal: {
    shortCode: 'proposal-short-code',
    members: [{ oidcSub: 'member-oidc-sub' }],
    dataAccessUsers: [{ oidcSub: 'visitor-oidc-sub' }], // Visitor is also a data access user
  } as ProposalMessageData,
  registrationAnswers: [],
};

const visitMessageWithApprovedDailyAllowance: VisitMessage = {
  ...visitMessage,
  id: '1e94c2d1-743b-48b5-99ae-f8c2d5f34e2b',
  registrationAnswers: [
    { questionNaturalKey: 'request_daily_allowance', value: true },
    { questionNaturalKey: 'daily_allowance_is_approved', value: true },
  ],
};

const visitMessageVisitorNotMember: VisitMessage = {
  ...visitMessage,
  proposal: {
    ...visitMessage.proposal,
    dataAccessUsers: [], // remove visitor from data access users
  } as ProposalMessageData,
};

const visitMessageVisitorOnlyInVisitors: VisitMessage = {
  ...visitMessage,
  proposal: {
    ...visitMessage.proposal,
    dataAccessUsers: [],
    visitors: [
      {
        id: 524,
        firstName: 'Visitor',
        lastName: 'Only',
        email: 'visitor@example.com',
        oidcSub: 'visitor-oidc-sub',
      },
    ],
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
      expect(mockOneIdentity.upsertPersonWantsOrg).not.toHaveBeenCalled();
      expect(mockOneIdentity.logout).toHaveBeenCalled();
    });
  });

  describe('VISIT_CREATED', () => {
    it('should create site access and system access in One Identity for science users and connect to proposal', async () => {
      // Mock the current time to a fixed value for testing
      const mockNowDate = new Date('2022-12-15T12:30:00.000Z');
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => mockNowDate.getTime());
      const visitMessageWithTimes = {
        ...visitMessage,
        startAt: '2023-01-01T10:30:00.000Z',
        endAt: '2023-01-10T14:45:00.000Z',
      };

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
      mockOneIdentity.upsertPersonWantsOrg
        .mockResolvedValueOnce([mockSiteAccess])
        .mockResolvedValueOnce([mockSystemAccess]);

      await syncVisitToOneIdentityHandler(
        visitMessageWithTimes,
        Event.VISIT_CREATED
      );

      expect(mockOneIdentity.login).toHaveBeenCalled();
      expect(mockOneIdentity.getPerson).toHaveBeenCalledWith(
        'visitor-oidc-sub'
      );
      expect(mockOneIdentity.getProposal).toHaveBeenCalledWith(
        visitMessageWithTimes.proposal
      );
      expect(mockOneIdentity.getProposalPersonConnections).toHaveBeenCalledWith(
        mockUidESet
      );

      // Verify site access creation
      expect(mockOneIdentity.upsertPersonWantsOrg).toHaveBeenCalledTimes(2);
      expect(mockOneIdentity.upsertPersonWantsOrg).toHaveBeenNthCalledWith(
        1,
        PersonWantsOrgRole.SITE_ACCESS,
        visitMessageWithTimes.visitorId,
        '2023-01-01T00:00:00.000Z',
        '2023-01-11T00:00:00.000Z',
        visitMessageWithTimes.id
      );

      // Calculate expected system access dates
      // validFrom should be the current mock date
      const expectedValidFrom = '2022-12-15T00:00:00.000Z';
      const expectedEndDate = new Date(visitMessageWithTimes.endAt);
      expectedEndDate.setUTCDate(
        expectedEndDate.getUTCDate() +
          parseInt(ONE_IDENTITY_SYSTEM_ACCESS_LASTS_FOR_DAYS) +
          1
      );
      expectedEndDate.setUTCHours(0, 0, 0, 0);

      // Verify system access creation
      expect(mockOneIdentity.upsertPersonWantsOrg).toHaveBeenNthCalledWith(
        2,
        PersonWantsOrgRole.SYSTEM_ACCESS,
        visitMessageWithTimes.visitorId,
        expectedValidFrom,
        expectedEndDate.toISOString(),
        visitMessageWithTimes.id
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

    it.each([
      [
        '2023-01-01T00:00:00.000Z',
        '2023-01-10T00:00:00.000Z',
        '2023-01-01T00:00:00.000Z',
        '2023-01-11T00:00:00.000Z',
        '2023-01-01',
        '2023-01-10',
      ],
      [
        '2023-01-01T10:30:00.000Z',
        '2023-01-10T14:45:00.000Z',
        '2023-01-01T00:00:00.000Z',
        '2023-01-11T00:00:00.000Z',
        '2023-01-01',
        '2023-01-10',
      ],
      [
        '2023-02-28T10:30:00.000Z',
        '2023-02-28T14:45:00.000Z',
        '2023-02-28T00:00:00.000Z',
        '2023-03-01T00:00:00.000Z',
        '2023-02-28',
        '2023-02-28',
      ],
      [
        '2023-12-31T10:30:00.000Z',
        '2023-12-31T14:45:00.000Z',
        '2023-12-31T00:00:00.000Z',
        '2024-01-01T00:00:00.000Z',
        '2023-12-31',
        '2023-12-31',
      ],
      [
        '2026-10-15T00:00:00.000Z',
        '2026-10-16T00:00:00.000Z',
        '2026-10-15T00:00:00.000Z',
        '2026-10-17T00:00:00.000Z',
        '2026-10-15',
        '2026-10-16',
      ],
    ])(
      'should create an approved PEJ allowance with inclusive date-only validity (%s to %s)',
      async (
        startAt,
        endAt,
        expectedFrom,
        expectedTo,
        allowanceFrom,
        allowanceTo
      ) => {
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
        const allowanceVisitMessage: VisitMessage = {
          ...visitMessageWithApprovedDailyAllowance,
          startAt,
          endAt,
        };

        mockOneIdentity.getPerson.mockResolvedValueOnce(mockPerson);
        mockOneIdentity.getProposal.mockResolvedValueOnce(mockUidESet);
        mockOneIdentity.getProposalPersonConnections.mockResolvedValueOnce([]);
        mockOneIdentity.upsertPersonWantsOrg
          .mockResolvedValueOnce([mockSiteAccess])
          .mockResolvedValueOnce([mockSystemAccess]);

        await syncVisitToOneIdentityHandler(
          allowanceVisitMessage,
          Event.VISIT_CREATED
        );

        expect(mockOneIdentity.upsertPersonWantsOrg).toHaveBeenNthCalledWith(
          1,
          PersonWantsOrgRole.SITE_ACCESS,
          allowanceVisitMessage.visitorId,
          expectedFrom,
          expectedTo,
          allowanceVisitMessage.id
        );
        expect(mockOneIdentity.syncPEJAllowance).toHaveBeenCalledWith(
          allowanceVisitMessage.visitorId,
          allowanceVisitMessage.id,
          'upsert',
          allowanceFrom,
          allowanceTo
        );
        expect(logger.logInfo).toHaveBeenCalledWith(
          'PEJ allowance synchronized in One Identity',
          {
            visitId: allowanceVisitMessage.id,
            centralAccount: allowanceVisitMessage.visitorId,
            operation: 'upsert',
            dateFrom: allowanceFrom,
            dateTo: allowanceTo,
          }
        );
      }
    );

    it('should not upsert a PEJ allowance unless it is both requested and approved', async () => {
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
      const visitMessageWithUnapprovedDailyAllowance: VisitMessage = {
        ...visitMessageWithApprovedDailyAllowance,
        registrationAnswers: [
          { questionNaturalKey: 'request_daily_allowance', value: true },
          {
            questionNaturalKey: 'daily_allowance_is_approved',
            value: false,
          },
        ],
      };

      mockOneIdentity.getPerson.mockResolvedValueOnce(mockPerson);
      mockOneIdentity.getProposal.mockResolvedValueOnce(mockUidESet);
      mockOneIdentity.getProposalPersonConnections.mockResolvedValueOnce([]);
      mockOneIdentity.upsertPersonWantsOrg
        .mockResolvedValueOnce([mockSiteAccess])
        .mockResolvedValueOnce([mockSystemAccess]);

      await syncVisitToOneIdentityHandler(
        visitMessageWithUnapprovedDailyAllowance,
        Event.VISIT_CREATED
      );

      expect(mockOneIdentity.syncPEJAllowance).not.toHaveBeenCalled();
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
      mockOneIdentity.upsertPersonWantsOrg
        .mockResolvedValueOnce([mockSiteAccess])
        .mockResolvedValueOnce([mockSystemAccess]);

      await syncVisitToOneIdentityHandler(visitMessage, Event.VISIT_CREATED);

      expect(mockOneIdentity.connectPersonToProposal).not.toHaveBeenCalled();
      expect(logger.logInfo).toHaveBeenCalledWith(
        'Visitor is already connected to proposal in One Identity, skipping connection creation',
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
      expect(mockOneIdentity.upsertPersonWantsOrg).not.toHaveBeenCalled();
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
      mockOneIdentity.upsertPersonWantsOrg.mockRejectedValueOnce(
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
      expect(mockOneIdentity.upsertPersonWantsOrg).not.toHaveBeenCalled();
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
          CustomProperty04: visitMessageVisitorNotMember.id,
          OrderState: OrderState.GRANTED,
        } as PersonWantsOrg,
        {
          UID_PersonWantsOrg: 'system-access-uid',
          UID_PersonOrdered: 'visitor-uid',
          DisplayOrg: PersonWantsOrgRole.SYSTEM_ACCESS,
          ValidFrom: '2023-01-01T00:00:00.000Z',
          ValidUntil: '2023-01-10T00:00:00.000Z',
          CustomProperty04: visitMessageVisitorNotMember.id,
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

    it('should delete an approved PEJ allowance with empty date parameters', async () => {
      const mockPerson = {
        UID_Person: 'visitor-uid',
        CCC_EmployeeSubType: IdentityType.ESSSCIENCEUSER,
      } as Person;
      const mockPersonWantsOrgs = [
        {
          UID_PersonWantsOrg: 'site-access-uid',
          DisplayOrg: PersonWantsOrgRole.SITE_ACCESS,
          CustomProperty04: visitMessageWithApprovedDailyAllowance.id,
          OrderState: OrderState.GRANTED,
        } as PersonWantsOrg,
        {
          UID_PersonWantsOrg: 'system-access-uid',
          DisplayOrg: PersonWantsOrgRole.SYSTEM_ACCESS,
          CustomProperty04: visitMessageWithApprovedDailyAllowance.id,
          OrderState: OrderState.GRANTED,
        } as PersonWantsOrg,
      ];

      mockOneIdentity.getPerson.mockResolvedValueOnce(mockPerson);
      mockOneIdentity.getProposal.mockResolvedValueOnce(mockUidESet);
      mockOneIdentity.getPersonWantsOrg.mockResolvedValueOnce(
        mockPersonWantsOrgs
      );

      await syncVisitToOneIdentityHandler(
        visitMessageWithApprovedDailyAllowance,
        Event.VISIT_DELETED
      );

      expect(mockOneIdentity.syncPEJAllowance).toHaveBeenCalledWith(
        visitMessageWithApprovedDailyAllowance.visitorId,
        visitMessageWithApprovedDailyAllowance.id,
        'delete',
        '',
        ''
      );
      expect(logger.logInfo).toHaveBeenCalledWith(
        'PEJ allowance synchronized in One Identity',
        {
          visitId: visitMessageWithApprovedDailyAllowance.id,
          centralAccount: visitMessageWithApprovedDailyAllowance.visitorId,
          operation: 'delete',
          dateFrom: '',
          dateTo: '',
        }
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
          CustomProperty04: visitMessage.id,
          OrderState: OrderState.GRANTED,
        } as PersonWantsOrg,
        {
          UID_PersonWantsOrg: 'system-access-uid',
          UID_PersonOrdered: 'visitor-uid',
          DisplayOrg: PersonWantsOrgRole.SYSTEM_ACCESS,
          ValidFrom: '2023-01-01T00:00:00.000Z',
          ValidUntil: '2023-01-10T00:00:00.000Z',
          CustomProperty04: visitMessage.id,
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
        'Visitor is a proposal member, skipping removal',
        {
          uidPerson: mockPerson.UID_Person,
          uidESet: mockUidESet,
        }
      );
      expect(mockOneIdentity.logout).toHaveBeenCalled();
    });

    it('should skip removing proposal connection if visitor is still in the visitors list', async () => {
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
          CustomProperty04: '1',
          OrderState: OrderState.GRANTED,
        } as PersonWantsOrg,
        {
          UID_PersonWantsOrg: 'system-access-uid',
          UID_PersonOrdered: 'visitor-uid',
          DisplayOrg: PersonWantsOrgRole.SYSTEM_ACCESS,
          ValidFrom: '2023-01-01T00:00:00.000Z',
          ValidUntil: '2023-01-10T00:00:00.000Z',
          CustomProperty04: '1',
          OrderState: OrderState.GRANTED,
        } as PersonWantsOrg,
      ];

      mockOneIdentity.getPerson.mockResolvedValueOnce(mockPerson);
      mockOneIdentity.getProposal.mockResolvedValueOnce(mockUidESet);
      mockOneIdentity.getPersonWantsOrg.mockResolvedValueOnce(
        mockPersonWantsOrgs
      );

      await syncVisitToOneIdentityHandler(
        visitMessageVisitorOnlyInVisitors,
        Event.VISIT_DELETED
      );

      expect(
        mockOneIdentity.removeConnectionBetweenPersonAndProposal
      ).not.toHaveBeenCalled();
      expect(logger.logInfo).toHaveBeenCalledWith(
        'Visitor is a proposal member, skipping removal',
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
      ).rejects.toThrow(
        'Person with central account "visitor-oidc-sub" not found in One Identity'
      );

      expect(mockOneIdentity.login).toHaveBeenCalled();
      expect(mockOneIdentity.getPerson).toHaveBeenCalledWith(
        'visitor-oidc-sub'
      );
      expect(mockOneIdentity.getPersonWantsOrg).not.toHaveBeenCalled();
      expect(mockOneIdentity.cancelPersonWantsOrg).not.toHaveBeenCalled();
      expect(mockOneIdentity.logout).toHaveBeenCalled();
    });

    describe('idempotent access cleanup', () => {
      const mockPerson = {
        UID_Person: 'visitor-uid',
        CCC_EmployeeSubType: IdentityType.ESSSCIENCEUSER,
      } as Person;
      const siteAccess = {
        UID_PersonWantsOrg: 'site-access-uid',
        DisplayOrg: PersonWantsOrgRole.SITE_ACCESS,
        CustomProperty04: visitMessage.id,
        OrderState: OrderState.GRANTED,
      } as PersonWantsOrg;
      const systemAccess = {
        UID_PersonWantsOrg: 'system-access-uid',
        DisplayOrg: PersonWantsOrgRole.SYSTEM_ACCESS,
        CustomProperty04: visitMessage.id,
        OrderState: OrderState.GRANTED,
      } as PersonWantsOrg;

      beforeEach(() => {
        mockOneIdentity.getPerson.mockResolvedValueOnce(mockPerson);
        mockOneIdentity.getProposal.mockResolvedValueOnce(mockUidESet);
      });

      it.each([
        {
          scenario: 'site access is missing',
          accesses: [
            { ...siteAccess, CustomProperty04: 'other-visit' },
            systemAccess,
          ],
          expectedUids: ['system-access-uid'],
        },
        {
          scenario: 'system access is missing',
          accesses: [
            siteAccess,
            { ...systemAccess, CustomProperty04: 'other-visit' },
          ],
          expectedUids: ['site-access-uid'],
        },
        {
          scenario: 'both access records are missing',
          accesses: [],
          expectedUids: [],
        },
        {
          scenario: 'only records for another visit exist',
          accesses: [
            { ...siteAccess, CustomProperty04: 'other-visit' },
            { ...systemAccess, CustomProperty04: 'other-visit' },
          ],
          expectedUids: [],
        },
        {
          scenario: 'site access is already aborted',
          accesses: [
            { ...siteAccess, OrderState: OrderState.ABORTED },
            systemAccess,
          ],
          expectedUids: ['system-access-uid'],
        },
        {
          scenario: 'site access is already unsubscribed',
          accesses: [
            { ...siteAccess, OrderState: OrderState.UNSUBSCRIBED },
            systemAccess,
          ],
          expectedUids: ['system-access-uid'],
        },
        {
          scenario: 'system access is already aborted',
          accesses: [
            siteAccess,
            { ...systemAccess, OrderState: OrderState.ABORTED },
          ],
          expectedUids: ['site-access-uid'],
        },
        {
          scenario: 'system access is already unsubscribed',
          accesses: [
            siteAccess,
            { ...systemAccess, OrderState: OrderState.UNSUBSCRIBED },
          ],
          expectedUids: ['site-access-uid'],
        },
        {
          scenario: 'both access records are already cancelled',
          accesses: [
            { ...siteAccess, OrderState: OrderState.ABORTED },
            { ...systemAccess, OrderState: OrderState.UNSUBSCRIBED },
          ],
          expectedUids: [],
        },
        {
          scenario: 'multiple active records exist for the visit',
          accesses: [
            siteAccess,
            { ...siteAccess, UID_PersonWantsOrg: 'second-site-access-uid' },
            systemAccess,
          ],
          expectedUids: [
            'site-access-uid',
            'second-site-access-uid',
            'system-access-uid',
          ],
        },
      ])(
        'should finish cleanup when $scenario',
        async ({ accesses, expectedUids }) => {
          mockOneIdentity.getPersonWantsOrg.mockResolvedValueOnce(accesses);

          await syncVisitToOneIdentityHandler(
            visitMessageVisitorNotMember,
            Event.VISIT_DELETED
          );

          expect(mockOneIdentity.cancelPersonWantsOrg.mock.calls).toEqual(
            expectedUids.map((uid) => [uid])
          );
          expect(
            mockOneIdentity.removeConnectionBetweenPersonAndProposal
          ).toHaveBeenCalledWith(mockUidESet, mockPerson.UID_Person);
          expect(mockOneIdentity.logout).toHaveBeenCalledTimes(1);
        }
      );

      it('should retry system cancellation without cancelling site access again', async () => {
        const error = new Error('System cancellation failed');
        mockOneIdentity.getPerson.mockResolvedValueOnce(mockPerson);
        mockOneIdentity.getProposal.mockResolvedValueOnce(mockUidESet);
        mockOneIdentity.getPersonWantsOrg
          .mockResolvedValueOnce([siteAccess, systemAccess])
          .mockResolvedValueOnce([
            { ...siteAccess, OrderState: OrderState.ABORTED },
            systemAccess,
          ]);
        mockOneIdentity.cancelPersonWantsOrg
          .mockResolvedValueOnce(undefined)
          .mockRejectedValueOnce(error)
          .mockResolvedValueOnce(undefined);

        await expect(
          syncVisitToOneIdentityHandler(
            visitMessageVisitorNotMember,
            Event.VISIT_DELETED
          )
        ).rejects.toBe(error);
        expect(
          mockOneIdentity.removeConnectionBetweenPersonAndProposal
        ).not.toHaveBeenCalled();

        await syncVisitToOneIdentityHandler(
          visitMessageVisitorNotMember,
          Event.VISIT_DELETED
        );

        expect(mockOneIdentity.cancelPersonWantsOrg.mock.calls).toEqual([
          ['site-access-uid'],
          ['system-access-uid'],
          ['system-access-uid'],
        ]);
        expect(
          mockOneIdentity.removeConnectionBetweenPersonAndProposal
        ).toHaveBeenCalledTimes(1);
        expect(mockOneIdentity.logout).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('VISIT_UPDATED', () => {
    it('should update site access and system access dates when visit dates have changed', async () => {
      const mockPerson = {
        UID_Person: 'visitor-uid',
        CCC_EmployeeSubType: IdentityType.ESSSCIENCEUSER,
      } as Person;

      const oldSiteAccess = {
        UID_PersonWantsOrg: 'site-access-uid',
        UID_PersonOrdered: 'visitor-uid',
        DisplayOrg: PersonWantsOrgRole.SITE_ACCESS,
        ValidFrom: '2023-01-01T00:00:00.000Z',
        ValidUntil: '2023-01-10T00:00:00.000Z',
        CustomProperty04: '1',
        OrderState: OrderState.GRANTED,
      } as PersonWantsOrg;

      const oldSystemAccess = {
        UID_PersonWantsOrg: 'system-access-uid',
        UID_PersonOrdered: 'visitor-uid',
        DisplayOrg: PersonWantsOrgRole.SYSTEM_ACCESS,
        ValidFrom: '2023-01-01T00:00:00.000Z',
        ValidUntil: '2023-01-25T00:00:00.000Z',
        CustomProperty04: '1',
        OrderState: OrderState.GRANTED,
      } as PersonWantsOrg;

      const mockPersonWantsOrgs = [oldSiteAccess, oldSystemAccess];

      mockOneIdentity.getPerson.mockResolvedValueOnce(mockPerson);
      mockOneIdentity.getProposal.mockResolvedValueOnce(mockUidESet);
      mockOneIdentity.getPersonWantsOrg.mockResolvedValueOnce(
        mockPersonWantsOrgs
      );
      mockOneIdentity.getProposalPersonConnections.mockResolvedValueOnce([]); // No existing connection

      // Mock Date.now for system access update (same as creation logic)
      const mockNowDate = new Date();
      Date.now = jest.fn(() => mockNowDate.getTime());

      // Updated visit message with new dates
      const updatedVisitMessage: VisitMessage = {
        ...visitMessage,
        startAt: '2023-02-01T00:00:00.000Z',
        endAt: '2023-02-15T00:00:00.000Z',
      };

      await syncVisitToOneIdentityHandler(
        updatedVisitMessage,
        Event.VISIT_UPDATED
      );

      expect(mockOneIdentity.login).toHaveBeenCalled();
      expect(mockOneIdentity.getPerson).toHaveBeenCalledWith(
        'visitor-oidc-sub'
      );
      expect(mockOneIdentity.getPersonWantsOrg).toHaveBeenCalledWith(
        'visitor-uid'
      );

      // Verify site access update
      expect(mockOneIdentity.upsertPersonWantsOrg).toHaveBeenNthCalledWith(
        1,
        PersonWantsOrgRole.SITE_ACCESS,
        'visitor-oidc-sub',
        '2023-02-01T00:00:00.000Z',
        '2023-02-16T00:00:00.000Z',
        '1',
        'site-access-uid'
      );
      expect(logger.logInfo).toHaveBeenCalledWith(
        'Site access updated in One Identity',
        {
          UID_PersonWantsOrg: 'site-access-uid',
        }
      );

      // Verify system access update (ValidUntil extended by ONE_IDENTITY_SYSTEM_ACCESS_LASTS_FOR_DAYS)
      const expectedSystemAccessValidUntil = new Date(
        '2023-02-15T00:00:00.000Z'
      );
      expectedSystemAccessValidUntil.setUTCDate(
        expectedSystemAccessValidUntil.getUTCDate() +
          parseInt(ONE_IDENTITY_SYSTEM_ACCESS_LASTS_FOR_DAYS) +
          1
      );
      expectedSystemAccessValidUntil.setUTCHours(0, 0, 0, 0);
      const expectedSystemAccessValidFrom = new Date(mockNowDate);
      expectedSystemAccessValidFrom.setUTCHours(0, 0, 0, 0);
      expect(mockOneIdentity.upsertPersonWantsOrg).toHaveBeenNthCalledWith(
        2,
        PersonWantsOrgRole.SYSTEM_ACCESS,
        'visitor-oidc-sub',
        expectedSystemAccessValidFrom.toISOString(),
        expectedSystemAccessValidUntil.toISOString(),
        '1',
        'system-access-uid'
      );
      expect(logger.logInfo).toHaveBeenCalledWith(
        'System access updated in One Identity',
        {
          UID_PersonWantsOrg: 'system-access-uid',
        }
      );

      expect(mockOneIdentity.connectPersonToProposal).toHaveBeenCalledWith(
        mockUidESet,
        'visitor-uid'
      );
      expect(mockOneIdentity.logout).toHaveBeenCalled();
    });

    it.each(['missing', 'changed', 'unchanged'])(
      'should upsert an approved PEJ allowance with inclusive date-only validity when site access is %s on visit update',
      async (scenario) => {
        const mockPerson = {
          UID_Person: 'visitor-uid',
          CCC_EmployeeSubType: IdentityType.ESSSCIENCEUSER,
        } as Person;
        const updatedVisitMessage: VisitMessage = {
          ...visitMessageWithApprovedDailyAllowance,
          startAt: '2023-02-01T10:30:00.000Z',
          endAt: '2023-02-15T14:45:00.000Z',
        };
        const expectedFrom = '2023-02-01T00:00:00.000Z';
        const expectedTo = '2023-02-16T00:00:00.000Z';
        const mockSiteAccess = {
          UID_PersonWantsOrg: 'site-access-uid',
          DisplayOrg: PersonWantsOrgRole.SITE_ACCESS,
          CustomProperty04: updatedVisitMessage.id,
          OrderState: OrderState.GRANTED,
          ValidFrom:
            scenario === 'unchanged' ? expectedFrom : visitMessage.startAt,
          ValidUntil:
            scenario === 'unchanged' ? expectedTo : visitMessage.endAt,
        } as PersonWantsOrg;
        const mockSystemAccess = {
          UID_PersonWantsOrg: 'system-access-uid',
          DisplayOrg: PersonWantsOrgRole.SYSTEM_ACCESS,
          CustomProperty04: updatedVisitMessage.id,
          OrderState: OrderState.GRANTED,
        } as PersonWantsOrg;

        mockOneIdentity.getPerson.mockResolvedValueOnce(mockPerson);
        mockOneIdentity.getProposal.mockResolvedValueOnce(mockUidESet);
        mockOneIdentity.getPersonWantsOrg.mockResolvedValueOnce(
          scenario === 'missing' ? [] : [mockSiteAccess, mockSystemAccess]
        );
        if (scenario !== 'unchanged') {
          mockOneIdentity.upsertPersonWantsOrg
            .mockResolvedValueOnce([mockSiteAccess])
            .mockResolvedValueOnce([mockSystemAccess]);
        }
        mockOneIdentity.getProposalPersonConnections.mockResolvedValueOnce([]);

        await syncVisitToOneIdentityHandler(
          updatedVisitMessage,
          Event.VISIT_UPDATED
        );

        const expectedSiteAccessCalls =
          scenario === 'unchanged'
            ? []
            : [
                [
                  PersonWantsOrgRole.SITE_ACCESS,
                  updatedVisitMessage.visitorId,
                  expectedFrom,
                  expectedTo,
                  updatedVisitMessage.id,
                  ...(scenario === 'changed' ? ['site-access-uid'] : []),
                ],
              ];
        expect(
          mockOneIdentity.upsertPersonWantsOrg.mock.calls.filter(
            ([role]) => role === PersonWantsOrgRole.SITE_ACCESS
          )
        ).toEqual(expectedSiteAccessCalls);
        expect(mockOneIdentity.syncPEJAllowance).toHaveBeenCalledWith(
          updatedVisitMessage.visitorId,
          updatedVisitMessage.id,
          'upsert',
          '2023-02-01',
          '2023-02-15'
        );
        expect(logger.logInfo).toHaveBeenCalledWith(
          'PEJ allowance synchronized in One Identity',
          {
            visitId: updatedVisitMessage.id,
            centralAccount: updatedVisitMessage.visitorId,
            operation: 'upsert',
            dateFrom: '2023-02-01',
            dateTo: '2023-02-15',
          }
        );
      }
    );

    it('should skip update when visit dates have not changed', async () => {
      const mockPerson = {
        UID_Person: 'visitor-uid',
        CCC_EmployeeSubType: IdentityType.ESSSCIENCEUSER,
      } as Person;

      const mockSiteAccess = {
        UID_PersonWantsOrg: 'site-access-uid',
        UID_PersonOrdered: 'visitor-uid',
        DisplayOrg: PersonWantsOrgRole.SITE_ACCESS,
        ValidFrom: visitMessage.startAt,
        ValidUntil: '2023-01-11T00:00:00.000Z',
        CustomProperty04: '1',
        OrderState: OrderState.GRANTED,
      } as PersonWantsOrg;

      const mockSystemAccess = {
        UID_PersonWantsOrg: 'system-access-uid',
        UID_PersonOrdered: 'visitor-uid',
        DisplayOrg: PersonWantsOrgRole.SYSTEM_ACCESS,
        ValidFrom: visitMessage.startAt,
        ValidUntil: visitMessage.endAt,
        CustomProperty04: '1',
        OrderState: OrderState.GRANTED,
      } as PersonWantsOrg;

      const mockPersonWantsOrgs = [mockSiteAccess, mockSystemAccess];

      mockOneIdentity.getPerson.mockResolvedValueOnce(mockPerson);
      mockOneIdentity.getProposal.mockResolvedValueOnce(mockUidESet);
      mockOneIdentity.getPersonWantsOrg.mockResolvedValueOnce(
        mockPersonWantsOrgs
      );
      mockOneIdentity.getProposalPersonConnections.mockResolvedValueOnce([]); // No existing connection

      await syncVisitToOneIdentityHandler(visitMessage, Event.VISIT_UPDATED);

      expect(mockOneIdentity.login).toHaveBeenCalled();
      expect(mockOneIdentity.getPerson).toHaveBeenCalledWith(
        'visitor-oidc-sub'
      );

      // Verify no update occurred
      expect(mockOneIdentity.upsertPersonWantsOrg).toHaveBeenCalledTimes(0);
      expect(logger.logInfo).toHaveBeenCalledWith(
        'Visit dates unchanged, skipping access update in One Identity',
        {
          UID_PersonWantsOrg: 'site-access-uid',
          visitId: visitMessage.id,
        }
      );

      // But proposal connection should still be created as backup
      expect(mockOneIdentity.connectPersonToProposal).toHaveBeenCalledWith(
        mockUidESet,
        'visitor-uid'
      );
      expect(mockOneIdentity.logout).toHaveBeenCalled();
    });

    it('should create new access if site access not found', async () => {
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
      mockOneIdentity.getPersonWantsOrg.mockResolvedValueOnce([]); // No existing access
      mockOneIdentity.upsertPersonWantsOrg
        .mockResolvedValueOnce([mockSiteAccess])
        .mockResolvedValueOnce([mockSystemAccess]);
      mockOneIdentity.getProposalPersonConnections.mockResolvedValueOnce([]); // No existing connection

      await syncVisitToOneIdentityHandler(visitMessage, Event.VISIT_UPDATED);

      expect(mockOneIdentity.login).toHaveBeenCalled();
      expect(mockOneIdentity.getPerson).toHaveBeenCalledWith(
        'visitor-oidc-sub'
      );
      expect(mockOneIdentity.getPersonWantsOrg).toHaveBeenCalledWith(
        'visitor-uid'
      );

      expect(logger.logInfo).toHaveBeenCalledWith(
        'Site access not found in One Identity, creating access',
        {
          visitId: visitMessage.id,
          uidPerson: 'visitor-uid',
        }
      );

      // Verify creation occurred instead of update
      expect(mockOneIdentity.upsertPersonWantsOrg).toHaveBeenCalledTimes(2);

      expect(mockOneIdentity.connectPersonToProposal).toHaveBeenCalledWith(
        mockUidESet,
        'visitor-uid'
      );
      expect(mockOneIdentity.logout).toHaveBeenCalled();
    });

    it('should throw error if system access not found during update', async () => {
      const mockPerson = {
        UID_Person: 'visitor-uid',
        CCC_EmployeeSubType: IdentityType.ESSSCIENCEUSER,
      } as Person;

      const mockSiteAccess = {
        UID_PersonWantsOrg: 'site-access-uid',
        UID_PersonOrdered: 'visitor-uid',
        DisplayOrg: PersonWantsOrgRole.SITE_ACCESS,
        ValidFrom: '2023-01-01T00:00:00.000Z',
        ValidUntil: '2023-01-10T00:00:00.000Z',
        CustomProperty04: '1',
        OrderState: OrderState.GRANTED,
      } as PersonWantsOrg;

      const mockPersonWantsOrgs = [mockSiteAccess]; // Only site access, no system access

      mockOneIdentity.getPerson.mockResolvedValueOnce(mockPerson);
      mockOneIdentity.getProposal.mockResolvedValueOnce(mockUidESet);
      mockOneIdentity.getPersonWantsOrg.mockResolvedValueOnce(
        mockPersonWantsOrgs
      );

      const updatedVisitMessage: VisitMessage = {
        ...visitMessage,
        startAt: '2023-02-01T00:00:00.000Z',
        endAt: '2023-02-15T00:00:00.000Z',
      };

      await expect(
        syncVisitToOneIdentityHandler(updatedVisitMessage, Event.VISIT_UPDATED)
      ).rejects.toThrow(
        'System access not found in One Identity, cannot update access'
      );

      expect(mockOneIdentity.login).toHaveBeenCalled();
      expect(mockOneIdentity.getPerson).toHaveBeenCalledWith(
        'visitor-oidc-sub'
      );
      expect(mockOneIdentity.logout).toHaveBeenCalled();
    });

    it('should skip processing if visitor is not a science user', async () => {
      const mockPerson = {
        UID_Person: 'visitor-uid',
        CCC_EmployeeSubType: 'EMPLOYEEDK',
      } as Person;

      mockOneIdentity.getPerson.mockResolvedValueOnce(mockPerson);

      await syncVisitToOneIdentityHandler(visitMessage, Event.VISIT_UPDATED);

      expect(mockOneIdentity.login).toHaveBeenCalled();
      expect(mockOneIdentity.getPerson).toHaveBeenCalledWith(
        'visitor-oidc-sub'
      );
      expect(logger.logInfo).toHaveBeenCalledWith(
        'Visitor is not a Science User, skipping',
        {}
      );
      expect(mockOneIdentity.getPersonWantsOrg).not.toHaveBeenCalled();
      expect(mockOneIdentity.logout).toHaveBeenCalled();
    });

    it('should throw error if proposal is not found in One Identity', async () => {
      const mockPerson = {
        UID_Person: 'visitor-uid',
        CCC_EmployeeSubType: IdentityType.ESSSCIENCEUSER,
      } as Person;

      mockOneIdentity.getPerson.mockResolvedValueOnce(mockPerson);
      mockOneIdentity.getProposal.mockResolvedValueOnce(undefined); // Proposal not found

      await expect(
        syncVisitToOneIdentityHandler(visitMessage, Event.VISIT_UPDATED)
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
      expect(mockOneIdentity.logout).toHaveBeenCalled();
    });

    it('should throw error if person not found', async () => {
      mockOneIdentity.getPerson.mockResolvedValueOnce(undefined);

      await expect(
        syncVisitToOneIdentityHandler(visitMessage, Event.VISIT_UPDATED)
      ).rejects.toThrow(
        'Person with central account "visitor-oidc-sub" not found in One Identity'
      );

      expect(mockOneIdentity.login).toHaveBeenCalled();
      expect(mockOneIdentity.getPerson).toHaveBeenCalledWith(
        'visitor-oidc-sub'
      );
      expect(mockOneIdentity.getPersonWantsOrg).not.toHaveBeenCalled();
      expect(mockOneIdentity.logout).toHaveBeenCalled();
    });
  });
});
