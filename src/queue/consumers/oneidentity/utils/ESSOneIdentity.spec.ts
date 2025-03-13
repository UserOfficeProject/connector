jest.mock('./OneIdentityApi', () => ({
  OneIdentityApi: jest.fn().mockImplementation(() => mockOneIdentityApi),
}));
jest.mock('process', () => ({
  env: {
    ONE_IDENTITY_API_USER: 'API_USER',
    ONE_IDENTITY_API_PASSWORD: 'API_PASSWORD',
    ONE_IDENTITY_PROPOSAL_IDENT_ESET_TYPE: 'PROPOSAL_IDENT_ESET_TYPE',
  },
}));

import { ESSOneIdentity } from './ESSOneIdentity';
import {
  OrderState,
  PersonWantsOrg,
  PersonWantsOrgRole,
} from './interfaces/PersonWantsOrg';
import { ProposalMessageData } from '../../../../models/ProposalMessage';
import { ProposalUser } from '../../scicat/scicatProposal/dto';

const mockOneIdentityApi = {
  login: jest.fn(),
  logout: jest.fn(),
  createEntity: jest.fn(),
  getEntities: jest.fn(),
  deleteEntity: jest.fn(),
  callScript: jest.fn(),
};

describe('ESSOneIdentity', () => {
  let essOneIdentity: ESSOneIdentity;

  beforeEach(() => {
    essOneIdentity = new ESSOneIdentity();
  });

  describe('login', () => {
    it('should login', async () => {
      await essOneIdentity.login();
      expect(mockOneIdentityApi.login).toHaveBeenCalledWith(
        'API_USER',
        'API_PASSWORD'
      );
    });
  });

  describe('logout', () => {
    it('should logout', async () => {
      await essOneIdentity.logout();
      expect(mockOneIdentityApi.logout).toHaveBeenCalled();
    });
  });

  describe('createProposal', () => {
    it('should create proposal', async () => {
      const proposalMessage = {
        shortCode: 'some-short-code',
      } as ProposalMessageData;

      mockOneIdentityApi.getEntities.mockResolvedValueOnce([
        {
          values: {
            UID_ESetType: 'eset-type-uid',
          },
        },
      ]);

      mockOneIdentityApi.createEntity.mockResolvedValueOnce({
        uid: 'created-uid',
      });

      const result = await essOneIdentity.createProposal(proposalMessage);

      expect(mockOneIdentityApi.getEntities).toHaveBeenCalledWith(
        'EsetType',
        "Ident_ESetType='PROPOSAL_IDENT_ESET_TYPE'"
      );
      expect(mockOneIdentityApi.createEntity).toHaveBeenCalledWith('ESET', {
        DisplayName: 'some-short-code',
        Ident_ESet: 'some-short-code',
        UID_ESetType: 'eset-type-uid',
      });
      expect(result).toBe('created-uid');
    });

    it('should throw an error when UID_ESetType is not found', async () => {
      const proposalMessage = {
        shortCode: 'some-short-code',
      } as ProposalMessageData;

      mockOneIdentityApi.getEntities.mockResolvedValueOnce([]);

      await expect(
        essOneIdentity.createProposal(proposalMessage)
      ).rejects.toThrow('UID_ESetType not found: PROPOSAL_IDENT_ESET_TYPE');
    });
  });

  describe('getProposal', () => {
    it('should get proposal', async () => {
      const proposalMessage = {
        shortCode: 'some-short-code',
      } as ProposalMessageData;

      mockOneIdentityApi.getEntities.mockResolvedValueOnce([
        {
          values: {
            UID_ESet: 'proposal-uid',
          },
        },
      ]);

      const result = await essOneIdentity.getProposal(proposalMessage);

      expect(mockOneIdentityApi.getEntities).toHaveBeenCalledWith(
        'ESET',
        "Ident_ESet='some-short-code'"
      );
      expect(result).toBe('proposal-uid');
    });

    it('should return undefined if proposal is not found', async () => {
      const proposalMessage = {
        shortCode: 'some-short-code',
      } as ProposalMessageData;

      mockOneIdentityApi.getEntities.mockResolvedValueOnce([]);

      const result = await essOneIdentity.getProposal(proposalMessage);

      expect(result).toBeUndefined();
    });
  });

  describe('getPerson', () => {
    it('should get a person', async () => {
      mockOneIdentityApi.getEntities.mockResolvedValueOnce([
        {
          values: {
            UID_Person: 'person-uid',
          },
        },
      ]);

      const result = await essOneIdentity.getPerson({
        oidcSub: '0000-0000-0000-0000',
      });

      expect(mockOneIdentityApi.getEntities).toHaveBeenCalledWith(
        'Person',
        "CentralAccount='0000-0000-0000-0000'",
        ['CCC_EmployeeSubType']
      );
      expect(result).toEqual({ UID_Person: 'person-uid' });
    });

    // The CentralAccount is unique, but the response is an array of entities
    it('should return the first person if multiple persons are found', async () => {
      mockOneIdentityApi.getEntities.mockResolvedValueOnce([
        {
          values: {
            UID_Person: 'person-1-uid',
          },
        },
        {
          values: {
            UID_Person: 'person-2-uid',
          },
        },
      ]);

      const result = await essOneIdentity.getPerson({
        oidcSub: '0000-0000-0000-0000',
      });

      expect(result).toEqual({ UID_Person: 'person-1-uid' });
    });
  });

  describe('getPersons', () => {
    it('should get person records for multiple users, undefined if not found', async () => {
      mockOneIdentityApi.getEntities.mockImplementation((table, filter) => {
        if (
          table === 'Person' &&
          filter === "CentralAccount='unknown-oidc-sub'"
        )
          return Promise.resolve([]);
        else
          return Promise.resolve([
            {
              values: {
                UID_Person: 'known-person-uid',
              },
            },
          ]);
      });

      const result = await essOneIdentity.getPersons([
        {
          oidcSub: 'unknown-oidc-sub',
        } as ProposalUser,
        {
          oidcSub: 'known-oidc-sub',
        } as ProposalUser,
      ]);

      expect(result).toEqual([
        {
          oidcSub: 'unknown-oidc-sub',
          uidPerson: undefined,
        },
        {
          oidcSub: 'known-oidc-sub',
          uidPerson: 'known-person-uid',
        },
      ]);
    });
  });

  describe('connectPersonToProposal', () => {
    it('should connect person to proposal', async () => {
      mockOneIdentityApi.createEntity.mockResolvedValueOnce({
        uid: 'created-uid',
      });

      const result = await essOneIdentity.connectPersonToProposal(
        'proposal-uid',
        'person-uid'
      );

      expect(mockOneIdentityApi.createEntity).toHaveBeenCalledWith(
        'PersonHasESET',
        {
          UID_ESet: 'proposal-uid',
          UID_Person: 'person-uid',
        }
      );
      expect(result).toBe('created-uid');
    });
  });

  describe('removeConnectionBetweenPersonAndProposal', () => {
    it('should remove connection between person and proposal', async () => {
      await essOneIdentity.removeConnectionBetweenPersonAndProposal(
        'proposal-uid',
        'person-uid'
      );

      expect(mockOneIdentityApi.deleteEntity).toHaveBeenCalledWith(
        'PersonHasESET',
        'proposal-uid;person-uid'
      );
    });
  });

  describe('getProposalPersonConnections', () => {
    it('should get proposal person connections', async () => {
      mockOneIdentityApi.getEntities.mockResolvedValueOnce([
        {
          values: {
            UID_ESet: 'proposal-uid',
            UID_Person: 'person-1-uid',
          },
        },
        {
          values: {
            UID_ESet: 'proposal-uid',
            UID_Person: 'person-2-uid',
          },
        },
      ]);

      const result =
        await essOneIdentity.getProposalPersonConnections('proposal-uid');

      expect(mockOneIdentityApi.getEntities).toHaveBeenCalledWith(
        'PersonHasESET',
        "UID_ESet='proposal-uid'"
      );
      expect(result).toEqual([
        {
          UID_ESet: 'proposal-uid',
          UID_Person: 'person-1-uid',
        },
        {
          UID_ESet: 'proposal-uid',
          UID_Person: 'person-2-uid',
        },
      ]);
    });
  });

  describe('createPersonWantsOrg', () => {
    const role = PersonWantsOrgRole.SITE_ACCESS;
    const centralAccount = 'user123';
    const startDate = '2023-01-01';
    const endDate = '2023-12-31';
    const mockPersonWantsOrgData: PersonWantsOrg[] = [
      {
        UID_PersonWantsOrg: 'pwo-123',
        ValidFrom: startDate,
        ValidUntil: endDate,
      } as PersonWantsOrg,
    ];

    it('should successfully create site access', async () => {
      mockOneIdentityApi.callScript.mockResolvedValueOnce({
        IsSuccess: true,
        Data: mockPersonWantsOrgData,
        Message: 'Success',
      });

      const result = await essOneIdentity.createPersonWantsOrg(
        role,
        centralAccount,
        startDate,
        endDate
      );

      expect(mockOneIdentityApi.callScript).toHaveBeenCalledWith(
        'SCProposalSiteAccess',
        [role, centralAccount, centralAccount, startDate, endDate, '', '']
      );
      expect(result).toEqual(mockPersonWantsOrgData);
    });

    it('should successfully create site access with custom data', async () => {
      const customData = 'custom-data-123';
      mockOneIdentityApi.callScript.mockResolvedValueOnce({
        IsSuccess: true,
        Data: mockPersonWantsOrgData,
        Message: 'Success',
      });

      const result = await essOneIdentity.createPersonWantsOrg(
        role,
        centralAccount,
        startDate,
        endDate,
        customData
      );

      expect(mockOneIdentityApi.callScript).toHaveBeenCalledWith(
        'SCProposalSiteAccess',
        [
          role,
          centralAccount,
          centralAccount,
          startDate,
          endDate,
          customData,
          '',
        ]
      );
      expect(result).toEqual(mockPersonWantsOrgData);
    });

    it('should throw an error when site access creation fails', async () => {
      const errorMessage = 'Access denied';
      mockOneIdentityApi.callScript.mockResolvedValueOnce({
        IsSuccess: false,
        Data: null,
        Message: errorMessage,
      });

      await expect(
        essOneIdentity.createPersonWantsOrg(
          role,
          centralAccount,
          startDate,
          endDate
        )
      ).rejects.toThrow(`Failed to create site access:${errorMessage}`);
      expect(mockOneIdentityApi.callScript).toHaveBeenCalledWith(
        'SCProposalSiteAccess',
        [role, centralAccount, centralAccount, startDate, endDate, '', '']
      );
    });
  });

  describe('cancelPersonWantsOrg', () => {
    const uidPersonWantsOrg = 'pwo-123';

    it('should successfully cancel site access', async () => {
      mockOneIdentityApi.callScript.mockResolvedValueOnce({
        IsSuccess: true,
        Message: 'Success',
      });

      await essOneIdentity.cancelPersonWantsOrg(uidPersonWantsOrg);

      expect(mockOneIdentityApi.callScript).toHaveBeenCalledWith(
        'SCProposalSiteAccessCancel',
        [uidPersonWantsOrg]
      );
    });

    it('should throw an error when site access cancellation fails', async () => {
      const errorMessage = 'Access not found';
      mockOneIdentityApi.callScript.mockResolvedValueOnce({
        IsSuccess: false,
        Message: errorMessage,
      });

      await expect(
        essOneIdentity.cancelPersonWantsOrg(uidPersonWantsOrg)
      ).rejects.toThrow(`Failed to cancel site access:${errorMessage}`);
      expect(mockOneIdentityApi.callScript).toHaveBeenCalledWith(
        'SCProposalSiteAccessCancel',
        [uidPersonWantsOrg]
      );
    });
  });

  describe('getPersonWantsOrg', () => {
    const mockPersonWantsOrgData = [
      {
        values: {
          UID_PersonWantsOrg: 'pwo-123',
          DisplayOrg: PersonWantsOrgRole.SITE_ACCESS,
          ValidFrom: '2023-01-01',
          ValidUntil: '2023-12-31',
          OrderState: 'Granted',
        },
      },
      {
        values: {
          UID_PersonWantsOrg: 'pwo-456',
          DisplayOrg: PersonWantsOrgRole.SYSTEM_ACCESS,
          ValidFrom: '2023-01-01',
          ValidUntil: '2023-12-31',
          OrderState: 'Granted',
        },
      },
    ];

    it('should get person wants org records with default parameters', async () => {
      mockOneIdentityApi.getEntities.mockResolvedValueOnce(
        mockPersonWantsOrgData
      );

      const result = await essOneIdentity.getPersonWantsOrg('person-uid');

      expect(mockOneIdentityApi.getEntities).toHaveBeenCalledWith(
        'PersonWantsOrg',
        "UID_PersonOrdered='person-uid' AND OrderState='Granted' AND (DisplayOrg='Experiment visit - site access' OR DisplayOrg='Experiment visit - system access')",
        [
          'ValidFrom',
          'ValidUntil',
          'OrderState',
          'DisplayOrg',
          'CustomProperty04',
        ]
      );
      expect(result).toEqual([
        mockPersonWantsOrgData[0].values,
        mockPersonWantsOrgData[1].values,
      ]);
    });

    it('should get person wants org records with custom parameters', async () => {
      mockOneIdentityApi.getEntities.mockResolvedValueOnce(
        mockPersonWantsOrgData
      );

      const result = await essOneIdentity.getPersonWantsOrg(
        'person-uid',
        [PersonWantsOrgRole.SITE_ACCESS],
        OrderState.ABORTED
      );

      expect(mockOneIdentityApi.getEntities).toHaveBeenCalledWith(
        'PersonWantsOrg',
        "UID_PersonOrdered='person-uid' AND OrderState='Aborted' AND (DisplayOrg='Experiment visit - site access')",
        [
          'ValidFrom',
          'ValidUntil',
          'OrderState',
          'DisplayOrg',
          'CustomProperty04',
        ]
      );
      expect(result).toEqual([
        mockPersonWantsOrgData[0].values,
        mockPersonWantsOrgData[1].values,
      ]);
    });

    it('should return empty array when no records found', async () => {
      mockOneIdentityApi.getEntities.mockResolvedValueOnce([]);

      const result = await essOneIdentity.getPersonWantsOrg('person-uid');

      expect(mockOneIdentityApi.getEntities).toHaveBeenCalledWith(
        'PersonWantsOrg',
        "UID_PersonOrdered='person-uid' AND OrderState='Granted' AND (DisplayOrg='Experiment visit - site access' OR DisplayOrg='Experiment visit - system access')",
        [
          'ValidFrom',
          'ValidUntil',
          'OrderState',
          'DisplayOrg',
          'CustomProperty04',
        ]
      );
      expect(result).toEqual([]);
    });
  });
});
