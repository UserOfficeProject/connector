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
        DisplayName: 'some-short-code',
        Ident_ESet: 'some-short-code',
        UID_ESetType: 'eset-type-uid',
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
        email: 'foo@email',
      });

      expect(mockOneIdentityApi.getEntities).toHaveBeenCalledWith(
        'Person',
        "ContactEmail='foo@email'"
      );
      expect(result).toEqual({ UID_Person: 'person-uid' });
    });

    // Currently, the ContactEmail field is not unique in the 1IM.Person table.
    // This means that it is possible to have multiple persons with the same email.
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
        email: 'foo@email',
      });

      expect(result).toEqual({ UID_Person: 'person-1-uid' });
    });
  });

  describe('getPersons', () => {
    it('should get person records for multiple users, undefined if not found', async () => {
      mockOneIdentityApi.getEntities.mockImplementation((table, filter) => {
        if (table === 'Person' && filter === "ContactEmail='unknown-email'")
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
          email: 'unknown-email',
        } as ProposalUser,
        {
          email: 'known-email',
        } as ProposalUser,
      ]);

      expect(result).toEqual([
        {
          email: 'unknown-email',
          uidPerson: undefined,
        },
        {
          email: 'known-email',
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
});
