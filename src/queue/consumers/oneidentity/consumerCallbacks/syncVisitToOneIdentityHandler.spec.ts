jest.mock('@user-office-software/duo-logger');
jest.mock('../utils/ESSOneIdentity', () => ({
  ESSOneIdentity: jest.fn().mockImplementation(() => mockOneIdentity),
}));

import { logger } from '@user-office-software/duo-logger';

import { syncVisitToOneIdentityHandler } from './syncVisitToOneIdentityHandler';
import { Event } from '../../../../models/Event';
import { ESSOneIdentity } from '../utils/ESSOneIdentity';
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
};

const visitMessage: VisitMessage = {
  visitorId: 'visitor-oidc-sub',
  startAt: '2023-01-01T00:00:00.000Z',
  endAt: '2023-01-10T00:00:00.000Z',
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
      expect(mockOneIdentity.getPerson).toHaveBeenCalledWith({
        oidcSub: 'visitor-oidc-sub',
      });
      expect(logger.logInfo).toHaveBeenCalledWith(
        'Visitor is not a Science User, skipping',
        {}
      );
      expect(mockOneIdentity.createPersonWantsOrg).not.toHaveBeenCalled();
      expect(mockOneIdentity.logout).toHaveBeenCalled();
    });
  });

  describe('VISITOR_CREATED', () => {
    it('should create site access and system access in One Identity for science users', async () => {
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

      // Mock sequential calls to createPersonWantsOrg with different responses
      mockOneIdentity.createPersonWantsOrg
        .mockResolvedValueOnce([mockSiteAccess])
        .mockResolvedValueOnce([mockSystemAccess]);

      await syncVisitToOneIdentityHandler(visitMessage, Event.VISIT_CREATED);

      expect(mockOneIdentity.login).toHaveBeenCalled();
      expect(mockOneIdentity.getPerson).toHaveBeenCalledWith({
        oidcSub: 'visitor-oidc-sub',
      });

      // Verify site access creation
      expect(mockOneIdentity.createPersonWantsOrg).toHaveBeenCalledTimes(2);
      expect(mockOneIdentity.createPersonWantsOrg).toHaveBeenNthCalledWith(
        1,
        PersonWantsOrgRole.SITE_ACCESS,
        visitMessage.visitorId,
        visitMessage.startAt,
        visitMessage.endAt
      );

      // Calculate expected system access dates
      // validFrom should be 1 hour from mock now
      const expectedValidFrom = new Date(
        mockNowDate.getTime() + 60 * 60 * 1000
      );
      const expectedEndDate = new Date(visitMessage.endAt);
      expectedEndDate.setDate(expectedEndDate.getDate() + 30);

      // Verify system access creation with validFrom as 1 hour from now
      expect(mockOneIdentity.createPersonWantsOrg).toHaveBeenNthCalledWith(
        2,
        PersonWantsOrgRole.SYSTEM_ACCESS,
        visitMessage.visitorId,
        expectedValidFrom.toISOString(),
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

      expect(mockOneIdentity.logout).toHaveBeenCalled();

      // Restore original Date.now
      Date.now = originalDateNow;
    });

    it('should throw an error if site access creation fails', async () => {
      // Mock person that is a science user
      const mockPerson = {
        UID_Person: 'visitor-uid',
        CCC_EmployeeSubType: IdentityType.ESSSCIENCEUSER,
      } as Person;

      mockOneIdentity.getPerson.mockResolvedValueOnce(mockPerson);
      mockOneIdentity.createPersonWantsOrg.mockRejectedValueOnce(
        new Error('Failed to create site access')
      );

      await expect(
        syncVisitToOneIdentityHandler(visitMessage, Event.VISIT_CREATED)
      ).rejects.toThrow('Failed to create site access');

      expect(mockOneIdentity.login).toHaveBeenCalled();
      expect(mockOneIdentity.logout).toHaveBeenCalled();
    });
  });

  describe('VISITOR_DELETED', () => {
    it('should remove visitor access in One Identity for science users', async () => {
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
      mockOneIdentity.getPersonWantsOrg.mockResolvedValueOnce(
        mockPersonWantsOrgs
      );

      await syncVisitToOneIdentityHandler(visitMessage, Event.VISIT_DELETED);

      expect(mockOneIdentity.login).toHaveBeenCalled();
      expect(mockOneIdentity.getPerson).toHaveBeenCalledWith({
        oidcSub: 'visitor-oidc-sub',
      });
      expect(mockOneIdentity.getPersonWantsOrg).toHaveBeenCalledWith(
        'visitor-uid'
      );
      expect(mockOneIdentity.cancelPersonWantsOrg).toHaveBeenCalledTimes(2);
      expect(mockOneIdentity.cancelPersonWantsOrg).toHaveBeenNthCalledWith(
        1,
        'site-access-uid'
      );
      expect(mockOneIdentity.cancelPersonWantsOrg).toHaveBeenNthCalledWith(
        2,
        'system-access-uid'
      );
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
      expect(mockOneIdentity.getPerson).toHaveBeenCalledWith({
        oidcSub: 'visitor-oidc-sub',
      });
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
        'Person not found in One Identity, cannot remove access'
      );

      expect(mockOneIdentity.login).toHaveBeenCalled();
      expect(mockOneIdentity.getPerson).toHaveBeenCalledWith({
        oidcSub: 'visitor-oidc-sub',
      });
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
      mockOneIdentity.getPersonWantsOrg.mockResolvedValueOnce(
        mockPersonWantsOrgs
      );

      await expect(
        syncVisitToOneIdentityHandler(visitMessage, Event.VISIT_DELETED)
      ).rejects.toThrow(
        'Site access not found in One Identity, cannot remove access'
      );

      expect(mockOneIdentity.login).toHaveBeenCalled();
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
          ValidFrom: '2023-01-01T00:00:00.000Z',
          ValidUntil: '2023-01-10T00:00:00.000Z',
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
      mockOneIdentity.getPersonWantsOrg.mockResolvedValueOnce(
        mockPersonWantsOrgs
      );

      await expect(
        syncVisitToOneIdentityHandler(visitMessage, Event.VISIT_DELETED)
      ).rejects.toThrow(
        'System access not found in One Identity, cannot remove access'
      );

      expect(mockOneIdentity.login).toHaveBeenCalled();
      expect(mockOneIdentity.logout).toHaveBeenCalled();
    });
  });
});
