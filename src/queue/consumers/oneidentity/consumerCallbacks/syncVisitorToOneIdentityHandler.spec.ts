jest.mock('@user-office-software/duo-logger');
jest.mock('../utils/ESSOneIdentity', () => ({
  ESSOneIdentity: jest.fn().mockImplementation(() => mockOneIdentity),
  PersonWantsOrgRole: {
    SITE_ACCESS: 'SITE_ACCESS',
    SYSTEM_ACCESS: 'SYSTEM_ACCESS',
  },
  OrderState: {
    ASSIGNED: 'ASSIGNED',
  },
}));

import { logger } from '@user-office-software/duo-logger';

import { syncVisitorToOneIdentityHandler } from './syncVisitorToOneIdentityHandler';
import { Event } from '../../../../models/Event';
import { ESSOneIdentity } from '../utils/ESSOneIdentity';
import { IdentityType, Person } from '../utils/interfaces/Person';
import {
  OrderState,
  PersonWantsOrg,
  PersonWantsOrgRole,
} from '../utils/interfaces/PersonWantsOrg';
import { VisitorMessage } from '../utils/interfaces/VisitorMessage';

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
  createSiteAccess: jest.fn(),
  cancelSiteAccess: jest.fn(),
};

const visitorMessage: VisitorMessage = {
  visitorId: 'visitor-oidc-sub',
  startAt: '2023-01-01T00:00:00.000Z',
  endAt: '2023-01-10T00:00:00.000Z',
};

describe('syncVisitorToOneIdentityHandler', () => {
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

      await syncVisitorToOneIdentityHandler(
        visitorMessage,
        Event.VISITOR_CREATED
      );

      expect(mockOneIdentity.login).toHaveBeenCalled();
      expect(mockOneIdentity.getPerson).toHaveBeenCalledWith({
        oidcSub: 'visitor-oidc-sub',
      });
      expect(logger.logInfo).toHaveBeenCalledWith(
        'Visitor is not a Science User, skipping',
        {}
      );
      expect(mockOneIdentity.createSiteAccess).not.toHaveBeenCalled();
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

      mockOneIdentity.getPerson.mockResolvedValueOnce(mockPerson);

      // Mock createSiteAccess to return a specific value for the first call
      mockOneIdentity.createSiteAccess.mockImplementationOnce(() =>
        Promise.resolve([
          { UID_PersonWantsOrg: 'site-access-uid' } as PersonWantsOrg,
        ])
      );

      await syncVisitorToOneIdentityHandler(
        visitorMessage,
        Event.VISITOR_CREATED
      );

      expect(mockOneIdentity.login).toHaveBeenCalled();
      expect(mockOneIdentity.getPerson).toHaveBeenCalledWith({
        oidcSub: 'visitor-oidc-sub',
      });
      expect(logger.logInfo).toHaveBeenCalledWith(
        'One Identity successfully logged in',
        {}
      );

      // Verify site access creation
      expect(mockOneIdentity.createSiteAccess).toHaveBeenCalledTimes(2);
      expect(mockOneIdentity.createSiteAccess).toHaveBeenNthCalledWith(
        1,
        PersonWantsOrgRole.SITE_ACCESS,
        visitorMessage.visitorId,
        visitorMessage.startAt,
        visitorMessage.endAt
      );

      // Verify system access creation with the current time and extended end date
      expect(mockOneIdentity.createSiteAccess).toHaveBeenNthCalledWith(
        2,
        PersonWantsOrgRole.SYSTEM_ACCESS,
        visitorMessage.visitorId,
        mockNowDate.toISOString(),
        new Date(new Date(visitorMessage.endAt).setDate(30)).toISOString(),
        'site-access-uid'
      );

      expect(mockOneIdentity.logout).toHaveBeenCalled();
      expect(logger.logInfo).toHaveBeenCalledWith(
        'One Identity successfully logged out',
        {}
      );

      // Restore original Date.now
      Date.now = originalDateNow;
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
          OrderState: OrderState.ASSIGNED,
        } as PersonWantsOrg,
        {
          UID_PersonWantsOrg: 'system-access-uid',
          UID_PersonOrdered: 'visitor-uid',
          DisplayOrg: PersonWantsOrgRole.SYSTEM_ACCESS,
          ValidFrom: '2023-01-01T00:00:00.000Z',
          ValidUntil: '2023-01-10T00:00:00.000Z',
          CustomProperty04: 'site-access-uid',
          OrderState: OrderState.ASSIGNED,
        } as PersonWantsOrg,
      ];

      mockOneIdentity.getPerson.mockResolvedValueOnce(mockPerson);
      mockOneIdentity.getPersonWantsOrg.mockResolvedValueOnce(
        mockPersonWantsOrgs
      );

      await syncVisitorToOneIdentityHandler(
        visitorMessage,
        Event.VISITOR_DELETED
      );

      expect(mockOneIdentity.login).toHaveBeenCalled();
      expect(mockOneIdentity.getPerson).toHaveBeenCalledWith({
        oidcSub: 'visitor-oidc-sub',
      });
      expect(mockOneIdentity.getPersonWantsOrg).toHaveBeenCalledWith(
        'visitor-uid'
      );
      expect(mockOneIdentity.cancelSiteAccess).toHaveBeenCalledTimes(2);
      expect(mockOneIdentity.cancelSiteAccess).toHaveBeenNthCalledWith(
        1,
        'site-access-uid'
      );
      expect(mockOneIdentity.cancelSiteAccess).toHaveBeenNthCalledWith(
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

      await syncVisitorToOneIdentityHandler(
        visitorMessage,
        Event.VISITOR_DELETED
      );

      expect(mockOneIdentity.login).toHaveBeenCalled();
      expect(mockOneIdentity.getPerson).toHaveBeenCalledWith({
        oidcSub: 'visitor-oidc-sub',
      });
      expect(logger.logInfo).toHaveBeenCalledWith(
        'Visitor is not a Science User, skipping',
        {}
      );
      expect(mockOneIdentity.getPersonWantsOrg).not.toHaveBeenCalled();
      expect(mockOneIdentity.cancelSiteAccess).not.toHaveBeenCalled();
      expect(mockOneIdentity.logout).toHaveBeenCalled();
    });

    it('should throw error if person not found', async () => {
      mockOneIdentity.getPerson.mockResolvedValueOnce(undefined);

      await expect(
        syncVisitorToOneIdentityHandler(visitorMessage, Event.VISITOR_DELETED)
      ).rejects.toThrow(
        'Person not found in One Identity, cannot remove access'
      );

      expect(mockOneIdentity.login).toHaveBeenCalled();
      expect(mockOneIdentity.getPerson).toHaveBeenCalledWith({
        oidcSub: 'visitor-oidc-sub',
      });
      expect(mockOneIdentity.getPersonWantsOrg).not.toHaveBeenCalled();
      expect(mockOneIdentity.cancelSiteAccess).not.toHaveBeenCalled();
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
          OrderState: OrderState.ASSIGNED,
        } as PersonWantsOrg,
        {
          UID_PersonWantsOrg: 'system-access-uid',
          UID_PersonOrdered: 'visitor-uid',
          DisplayOrg: PersonWantsOrgRole.SYSTEM_ACCESS,
          ValidFrom: '2023-01-01T00:00:00.000Z',
          ValidUntil: '2023-01-10T00:00:00.000Z',
          CustomProperty04: 'site-access-uid',
          OrderState: OrderState.ASSIGNED,
        } as PersonWantsOrg,
      ];

      mockOneIdentity.getPerson.mockResolvedValueOnce(mockPerson);
      mockOneIdentity.getPersonWantsOrg.mockResolvedValueOnce(
        mockPersonWantsOrgs
      );

      await expect(
        syncVisitorToOneIdentityHandler(visitorMessage, Event.VISITOR_DELETED)
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
          OrderState: OrderState.ASSIGNED,
        } as PersonWantsOrg,
        // No system access with CustomProperty04 matching site-access-uid
        {
          UID_PersonWantsOrg: 'system-access-uid',
          UID_PersonOrdered: 'visitor-uid',
          DisplayOrg: PersonWantsOrgRole.SYSTEM_ACCESS,
          ValidFrom: '2023-01-01T00:00:00.000Z',
          ValidUntil: '2023-01-10T00:00:00.000Z',
          CustomProperty04: 'different-site-access-uid',
          OrderState: OrderState.ASSIGNED,
        } as PersonWantsOrg,
      ];

      mockOneIdentity.getPerson.mockResolvedValueOnce(mockPerson);
      mockOneIdentity.getPersonWantsOrg.mockResolvedValueOnce(
        mockPersonWantsOrgs
      );

      await expect(
        syncVisitorToOneIdentityHandler(visitorMessage, Event.VISITOR_DELETED)
      ).rejects.toThrow(
        'System access not found in One Identity, cannot remove access'
      );

      expect(mockOneIdentity.login).toHaveBeenCalled();
      expect(mockOneIdentity.logout).toHaveBeenCalled();
    });
  });
});
