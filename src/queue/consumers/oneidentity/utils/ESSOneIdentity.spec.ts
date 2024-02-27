jest.mock('./oneIdentityApi', () => ({
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
import { ProposalMessageData } from '../../../../models/ProposalMessage';
import { ProposalUser } from '../../scicat/scicatProposal/dto';

const mockOneIdentityApi = {
  login: jest.fn(),
  logout: jest.fn(),
  createEntity: jest.fn(),
  getEntities: jest.fn(),
  deleteEntity: jest.fn(),
};

describe('ESSOneIdentity', () => {
  let essOneIdentity: ESSOneIdentity;

  beforeEach(() => {
    essOneIdentity = new ESSOneIdentity();
  });

  afterEach(() => {
    jest.clearAllMocks();
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
        values: {
          DisplayName: 'some-short-code',
          Ident_ESet: 'some-short-code',
          UID_ESetType: 'eset-type-uid',
        },
      });
      expect(result).toBe('created-uid');
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
            UID_ESET: 'proposal-uid',
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
  });

  describe('createPerson', () => {
    it('should create person', async () => {
      mockOneIdentityApi.createEntity.mockResolvedValueOnce({
        uid: 'created-uid',
      });

      const result = await essOneIdentity.createPerson({
        email: 'some-email',
        oidcSub: 'some-oidc-sub',
        firstName: 'some-first-name',
        lastName: 'some-last-name',
      } as ProposalUser);

      expect(mockOneIdentityApi.createEntity).toHaveBeenCalledWith('Person', {
        CentralAccount: 'some-oidc-sub',
        ContactEmail: 'some-email',
        FirstName: 'some-first-name',
        ImportSource: 'SCUSystem',
        CustomProperty02: 'some-oidc-sub',
        LastName: 'some-last-name',
      });
      expect(result).toBe('created-uid');
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
        oidcSub: 'some-oidc-sub',
      });

      expect(mockOneIdentityApi.getEntities).toHaveBeenCalledWith(
        'Person',
        "CentralAccount='some-oidc-sub'"
      );
      expect(result).toEqual({ UID_Person: 'person-uid' });
    });
  });

  describe('getOrCreatePersons', () => {
    it('should get or create persons', async () => {
      mockOneIdentityApi.getEntities.mockImplementation((table, filter) => {
        if (table === 'Person' && filter === "CentralAccount='new-oidc-sub'")
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

      mockOneIdentityApi.createEntity.mockResolvedValueOnce({
        uid: 'new-created-uid',
      });

      const result = await essOneIdentity.getOrCreatePersons([
        {
          email: 'new-email',
          oidcSub: 'new-oidc-sub',
          firstName: 'new-first-name',
          lastName: 'new-last-name',
        } as ProposalUser,
        {
          email: 'known-email',
          oidcSub: 'known-oidc-sub',
          firstName: 'known-first-name',
          lastName: 'known-last-name',
        } as ProposalUser,
      ]);

      expect(mockOneIdentityApi.createEntity).toHaveBeenCalledWith('Person', {
        CentralAccount: 'new-oidc-sub',
        ContactEmail: 'new-email',
        FirstName: 'new-first-name',
        ImportSource: 'SCUSystem',
        CustomProperty02: 'new-oidc-sub',
        LastName: 'new-last-name',
      });
      expect(mockOneIdentityApi.createEntity).not.toHaveBeenCalledWith(
        'Person',
        {
          CentralAccount: 'known-oidc-sub',
          ContactEmail: 'known-email',
          FirstName: 'known-first-name',
          ImportSource: 'SCUSystem',
          LastName: 'known-last-name',
        }
      );

      expect(result).toEqual(['new-created-uid', 'known-person-uid']);
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
          UID_ESET: 'proposal-uid',
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
            UID_ESET: 'proposal-uid',
            UID_Person: 'person-1-uid',
          },
        },
        {
          values: {
            UID_ESET: 'proposal-uid',
            UID_Person: 'person-2-uid',
          },
        },
      ]);

      const result = await essOneIdentity.getProposalPersonConnections(
        'proposal-uid'
      );

      expect(mockOneIdentityApi.getEntities).toHaveBeenCalledWith(
        'PersonHasESET',
        "UID_ESET='proposal-uid'"
      );
      expect(result).toEqual([
        {
          UID_ESET: 'proposal-uid',
          UID_Person: 'person-1-uid',
        },
        {
          UID_ESET: 'proposal-uid',
          UID_Person: 'person-2-uid',
        },
      ]);
    });
  });
});
