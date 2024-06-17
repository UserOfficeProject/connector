import { ProposalUser } from './../queue/consumers/scicat/scicatProposal/dto';

export type Instrument = {
  id: number;
  shortCode: string;
  allocatedTime: number;
};

export enum ProposalStatusDefaultShortCodes {
  DRAFT = 'DRAFT',
  FEASIBILITY_REVIEW = 'FEASIBILITY_REVIEW',
  NOT_FEASIBLE = 'NOT_FEASIBLE',
  SEP_SELECTION = 'SEP_SELECTION',
  SEP_REVIEW = 'SEP_REVIEW',
  ALLOCATED = 'ALLOCATED',
  NOT_ALLOCATED = 'NOT_ALLOCATED',
  SCHEDULING = 'SCHEDULING',
  EXPIRED = 'EXPIRED',
  EDITABLE_SUBMITTED = 'EDITABLE_SUBMITTED',
  EDITABLE_SUBMITTED_INTERNAL = 'EDITABLE_SUBMITTED_INTERNAL',
}

export type ProposalMessageData = {
  proposalPk: number;
  shortCode: string;
  title: string;
  abstract: string;
  callId: number;
  newStatus?: ProposalStatusDefaultShortCodes;
  submitted: boolean;
  members: ProposalUser[];
  proposer?: ProposalUser;
  instruments?: Instrument[];
};
