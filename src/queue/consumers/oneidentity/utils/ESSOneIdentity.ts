import { env } from 'process';

import { OneIdentityApi } from './OneIdentityApi';
import { ProposalMessageData } from '../../../../models/ProposalMessage';
import { ProposalUser } from '../../scicat/scicatProposal/dto';

type UID_ESetType = string;
export type UID_Person = string;
export type UID_ESet = string;

interface EsetValues {
  UID_ESet: UID_ESet;
  UID_ESetType: UID_ESetType;
  Ident_ESet: string;
  DisplayName: string;
}

interface EsetTypeValues {
  UID_ESetType: UID_ESetType;
}

interface PersonValues {
  UID_Person: UID_Person;
}

export interface PersonHasESETValues {
  UID_Person: UID_Person;
  UID_ESet: UID_ESet;
}

export interface UserPersonConnection {
  email: string;
  uidPerson: UID_Person | undefined;
}

const SERVER_URL = env.ONE_IDENTITY_APP_SERVER_URL || '';
const API_USER = env.ONE_IDENTITY_API_USER || '';
const API_PASSWORD = env.ONE_IDENTITY_API_PASSWORD || '';
const PROPOSAL_IDENT_ESET_TYPE =
  env.ONE_IDENTITY_PROPOSAL_IDENT_ESET_TYPE || '';

// ESSOneIdentity is a class that provides methods to interact with ESS One Identity Manager
// It is used to create, update and delete proposals and users in ESS One Identity Manager
export class ESSOneIdentity {
  private oneIdentityApi: OneIdentityApi;

  constructor() {
    this.oneIdentityApi = new OneIdentityApi(SERVER_URL);
  }

  public async login() {
    await this.oneIdentityApi.login(API_USER, API_PASSWORD);
  }

  public async logout() {
    await this.oneIdentityApi.logout();
  }

  public async createProposal(
    proposalMessage: ProposalMessageData
  ): Promise<UID_ESet | undefined> {
    // get "Science Proposal" UID_ESetType from ESS One Identity
    const entities = await this.oneIdentityApi.getEntities<EsetTypeValues>(
      'EsetType',
      `Ident_ESetType='${PROPOSAL_IDENT_ESET_TYPE}'`
    );

    const uidESetType = entities[0]?.values?.UID_ESetType;

    if (!uidESetType) {
      throw new Error('UID_ESetType not found: ' + PROPOSAL_IDENT_ESET_TYPE);
    }

    // create proposal in ESS One Identity
    const esetResponse = await this.oneIdentityApi.createEntity<
      Omit<EsetValues, 'UID_ESet'>
    >('ESET', {
      UID_ESetType: uidESetType,
      Ident_ESet: proposalMessage.shortCode,
      DisplayName: proposalMessage.shortCode,
    });

    return esetResponse.uid;
  }

  public async getProposal(
    proposalMessage: ProposalMessageData
  ): Promise<UID_ESet | undefined> {
    const entities = await this.oneIdentityApi.getEntities<EsetValues>(
      'ESET',
      `Ident_ESet='${proposalMessage.shortCode}'`
    );

    return entities[0]?.values?.UID_ESet;
  }

  public async getPerson(
    user: Pick<ProposalUser, 'email'>
  ): Promise<PersonValues | undefined> {
    const entities = await this.oneIdentityApi.getEntities<PersonValues>(
      'Person',
      `ContactEmail='${user.email}'`
    );

    // In tehorie there should be only one person with the same email, but the 1IM.Person table has no unique constraint on ContactEmail.
    // We can't control this, so we just take the first one.
    return entities[0]?.values;
  }

  public async getPersons(
    users: ProposalUser[]
  ): Promise<UserPersonConnection[]> {
    return await Promise.all(
      users
        .filter((user): user is ProposalUser => user !== undefined)
        .map(async (user) => {
          const uidPerson = (await this.getPerson(user))?.UID_Person;

          return { email: user.email, uidPerson };
        })
    );
  }

  public async connectPersonToProposal(
    uidEset: UID_ESet,
    uidPerson: UID_Person
  ): Promise<string | undefined> {
    const { uid } = await this.oneIdentityApi.createEntity<PersonHasESETValues>(
      'PersonHasESET',
      {
        UID_ESet: uidEset,
        UID_Person: uidPerson,
      }
    );

    return uid;
  }

  public async removeConnectionBetweenPersonAndProposal(
    uidEset: UID_ESet,
    uidPerson: UID_Person
  ) {
    await this.oneIdentityApi.deleteEntity(
      'PersonHasESET',
      `${uidEset};${uidPerson}`
    );
  }

  public async getProposalPersonConnections(
    uidEset: UID_ESet
  ): Promise<PersonHasESETValues[]> {
    const entities = await this.oneIdentityApi.getEntities<PersonHasESETValues>(
      'PersonHasESET',
      `UID_ESet='${uidEset}'`
    );

    return entities.map(({ values }) => values);
  }
}
