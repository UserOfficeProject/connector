import { env } from 'process';

import { OneIdentityApi } from './OneIdentityApi';
import { ProposalMessageData } from '../../../../models/ProposalMessage';
import { ProposalUser } from '../../scicat/scicatProposal/dto';

type UID_ESetType = string;
export type UID_Person = string;
export type UID_ESET = string;

interface EsetValues {
  UID_ESET: UID_ESET;
}

interface EsetTypeValues {
  UID_ESetType: UID_ESetType;
}

interface PersonValues {
  UID_Person: UID_Person;
}

interface PersonHasESETValues {
  UID_Person: UID_Person;
  UID_ESET: UID_ESET;
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
  ): Promise<UID_ESET | undefined> {
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
    const esetResponse = await this.oneIdentityApi.createEntity('ESET', {
      values: {
        UID_ESetType: uidESetType,
        Ident_ESet: proposalMessage.shortCode,
        DisplayName: proposalMessage.shortCode,
      },
    });

    return esetResponse.uid;
  }

  public async getProposal(
    proposalMessage: ProposalMessageData
  ): Promise<UID_ESET | undefined> {
    const entities = await this.oneIdentityApi.getEntities<EsetValues>(
      'ESET',
      `Ident_ESet='${proposalMessage.shortCode}'`
    );

    return entities[0]?.values?.UID_ESET;
  }

  public async createPerson(
    user: Omit<ProposalUser, 'id'>
  ): Promise<UID_Person | undefined> {
    const { uid } = await this.oneIdentityApi.createEntity('Person', {
      CentralAccount: user.oidcSub,
      FirstName: user.firstName,
      LastName: user.lastName,
      ContactEmail: user.email,
      CustomProperty02: user.oidcSub,
      ImportSource: 'SCUSystem',
    });

    return uid;
  }

  public async getPerson(
    user: Pick<ProposalUser, 'oidcSub'>
  ): Promise<PersonValues | undefined> {
    const entities = await this.oneIdentityApi.getEntities<PersonValues>(
      'Person',
      `CentralAccount='${user.oidcSub}'`
    );

    return entities[0]?.values;
  }

  public async getOrCreatePersons(
    users: ProposalUser[]
  ): Promise<UID_Person[]> {
    return (
      await Promise.all(
        users
          .filter((user): user is ProposalUser => user !== undefined)
          .map(async (user) => {
            let uidPerson = (await this.getPerson(user))?.UID_Person;
            if (!uidPerson) {
              uidPerson = await this.createPerson(user);

              if (!uidPerson) {
                throw new Error('Person creation failed in ESS One Identity');
              }
            }

            return uidPerson;
          })
      )
    ).filter((uidPerson): uidPerson is UID_Person => !!uidPerson);
  }

  public async connectPersonToProposal(
    uidEset: string,
    uidPerson: string
  ): Promise<string | undefined> {
    const { uid } = await this.oneIdentityApi.createEntity('PersonHasESET', {
      UID_ESET: uidEset,
      UID_Person: uidPerson,
    });

    return uid;
  }

  public async removeConnectionBetweenPersonAndProposal(
    uidEset: string,
    uidPerson: string
  ) {
    await this.oneIdentityApi.deleteEntity(
      'PersonHasESET',
      `${uidEset};${uidPerson}`
    );
  }

  public async getProposalPersonConnections(
    uidEset: string
  ): Promise<PersonHasESETValues[]> {
    const entities = await this.oneIdentityApi.getEntities<PersonHasESETValues>(
      'PersonHasESET',
      `UID_ESET='${uidEset}'`
    );

    return entities.map(({ values }) => values);
  }
}
