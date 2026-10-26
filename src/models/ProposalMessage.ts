import { ProposalUser } from '../queue/consumers/scicat/scicatProposal/dto';

export type Instrument = {
  id: number;
  shortCode: string;
  allocatedTime: number;
};

export type Sample = {
  id: number;
  title: string;
};

export interface InstrumentDto {
  _id: string;
  id: string;
  name: string;
  pid: string;
  uniqueName: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt?: string;
  customMetadata: Record<string, unknown>;
}

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
  abstract: string;
  callId: number;
  instruments?: Instrument[];
  members: ProposalUser[];
  dataAccessUsers: ProposalUser[];
  visitors: ProposalUser[];
  newStatus?: string;
  proposalPk: number;
  proposer?: ProposalUser;
  shortCode: string;
  title: string;
  submitted: boolean;
  samples?: Sample[];
};

export type ExperimentMessageData = {
  experimentId: string;
  experimentPk: number;
  startsAt: Date;
  endsAt: Date;
  status: string;
  proposal?: ProposalMessageData;
  samples?: Sample[];
};
