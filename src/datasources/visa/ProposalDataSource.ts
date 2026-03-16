import { CountryPayload, InstitutionPayload } from './InstitutionDataSource';
import { ProposalStatusDefaultShortCodes } from '../../models/ProposalMessage';
import { Instrument, Proposal } from '../../models/Visa';
import { ValidProposalMessageData } from '../../queue/consumers/utils/validateProposalMessage';
export interface ProposerPayload {
  firstName?: string;
  lastName?: string;
  email?: string;
  id?: string;
  oidcSub?: string;
  oauthIssuer?: string;
  institution?: InstitutionPayload;
  country?: CountryPayload;
}
export interface ProposalSubmissionEventPayload {
  proposalPk: number;
  shortCode: string;
  title: string;
  abstract: string;
  callId: number;
  newStatus: ProposalStatusDefaultShortCodes;
  submitted: boolean;
  proposer?: ProposerPayload;
  members: ProposerPayload[];
  instruments: Instrument[];
}
export type ProposalUpdationEventPayload = ProposalSubmissionEventPayload;
export interface ProposalDataSource {
  get(id: number): Promise<Proposal | null>;
  create(proposal: ValidProposalMessageData): Promise<Proposal>;
  update(proposal: ValidProposalMessageData): Promise<Proposal>;
  delete(id: number): Promise<number>;
}
