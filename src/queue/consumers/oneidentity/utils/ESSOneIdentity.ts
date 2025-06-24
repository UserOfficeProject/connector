import { env } from 'process';

import { Eset, UID_ESet } from './interfaces/Eset';
import { EsetType } from './interfaces/EsetType';
import { Person, UID_Person } from './interfaces/Person';
import { PersonHasESET } from './interfaces/PersonHasESET';
import {
  OrderState,
  PersonWantsOrg,
  PersonWantsOrgRole,
} from './interfaces/PersonWantsOrg';
import {
  SCProposalSiteAccessCancelResponse,
  SCProposalSiteAccessResponse,
} from './interfaces/SCProposalSiteAccessResponse';
import { OneIdentityApi } from './OneIdentityApi';
import { ProposalMessageData } from '../../../../models/ProposalMessage';

export interface UserPersonConnection {
  oidcSub: string;
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
    const entities = await this.oneIdentityApi.getEntities<EsetType>(
      'EsetType',
      `Ident_ESetType='${PROPOSAL_IDENT_ESET_TYPE}'`
    );

    const uidESetType = entities[0]?.values?.UID_ESetType;

    if (!uidESetType) {
      throw new Error('UID_ESetType not found: ' + PROPOSAL_IDENT_ESET_TYPE);
    }

    // create proposal in ESS One Identity
    const esetResponse = await this.oneIdentityApi.createEntity<
      Omit<Eset, 'UID_ESet'>
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
    const entities = await this.oneIdentityApi.getEntities<Eset>(
      'ESET',
      `Ident_ESet='${proposalMessage.shortCode}'`
    );

    return entities[0]?.values?.UID_ESet;
  }

  public async getPerson(centralAccount: string): Promise<Person | undefined> {
    const entities = await this.oneIdentityApi.getEntities<Person>(
      'Person',
      `CentralAccount='${centralAccount}'`,
      ['CCC_EmployeeSubType']
    );

    return entities[0]?.values;
  }

  public async getPersons(centralAccounts: string[]): Promise<string[]> {
    return (
      await Promise.all(
        centralAccounts.map(
          async (centralAccount) =>
            (await this.getPerson(centralAccount))?.UID_Person
        )
      )
    ).filter((uidPerson): uidPerson is string => uidPerson !== undefined);
  }

  public async connectPersonToProposal(
    uidEset: UID_ESet,
    uidPerson: UID_Person
  ): Promise<string | undefined> {
    const { uid } = await this.oneIdentityApi.createEntity<PersonHasESET>(
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
  ): Promise<PersonHasESET[]> {
    const entities = await this.oneIdentityApi.getEntities<PersonHasESET>(
      'PersonHasESET',
      `UID_ESet='${uidEset}'`
    );

    return entities.map(({ values }) => values);
  }

  public async createPersonWantsOrg(
    role: PersonWantsOrgRole,
    centralAccount: string,
    startDate: string,
    endDate: string,
    customData: string = ''
  ): Promise<PersonWantsOrg[]> {
    const res =
      await this.oneIdentityApi.callScript<SCProposalSiteAccessResponse>(
        'SCProposalSiteAccess',
        [
          role, // access type
          centralAccount, // requester
          centralAccount, // recipient
          startDate,
          endDate,
          customData, // PersonWantsOrg.CustomProperty04
          '', // UID_PersonWantsOrg (empty for new)
        ]
      );

    if (!res.IsSuccess)
      throw new Error('Failed to create site access: ' + res.Message);

    return res.Data;
  }

  public async cancelPersonWantsOrg(uidPersonWantsOrg: string): Promise<void> {
    const res =
      await this.oneIdentityApi.callScript<SCProposalSiteAccessCancelResponse>(
        'SCProposalSiteAccessCancel',
        [uidPersonWantsOrg]
      );

    if (!res.IsSuccess)
      throw new Error('Failed to cancel site access:' + res.Message);
  }

  public async getPersonWantsOrg(
    uidPerson: UID_Person,
    displayOrgs: PersonWantsOrgRole[] = [
      PersonWantsOrgRole.SITE_ACCESS,
      PersonWantsOrgRole.SYSTEM_ACCESS,
    ]
  ): Promise<PersonWantsOrg[]> {
    const entities = await this.oneIdentityApi.getEntities<PersonWantsOrg>(
      'PersonWantsOrg',
      `UID_PersonOrdered='${uidPerson}' AND (${displayOrgs
        .map((org) => `DisplayOrg='${org}'`)
        .join(' OR ')})`,
      [
        'ValidFrom',
        'ValidUntil',
        'OrderState',
        'DisplayOrg',
        'CustomProperty04',
      ]
    );

    return entities.map(({ values }) => values);
  }

  public async hasPersonSiteAccessToProposal(
    uidPerson: UID_Person,
    proposal: UID_ESet
  ): Promise<boolean> {
    const personWantsOrgs = await this.getPersonWantsOrg(uidPerson, [
      PersonWantsOrgRole.SITE_ACCESS,
    ]);

    return personWantsOrgs.some(
      (pwo) =>
        pwo.DisplayOrg === PersonWantsOrgRole.SITE_ACCESS &&
        pwo.CustomProperty04 === proposal &&
        pwo.OrderState !== OrderState.ABORTED
    );
  }
}
