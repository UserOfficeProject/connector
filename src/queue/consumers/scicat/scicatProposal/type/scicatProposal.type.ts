export interface MdEntryValue {
  human_name?: string;
  value: string | number | boolean | null | undefined;
}

export interface MdEntry {
  [key: string]: MdEntryValue;
}

export type CreateScicatProposalDto = {
  ownerGroup: string;
  accessGroups: string[];
  proposalId: string;
  parentProposalId?: string;
  pi_email: string;
  pi_firstname: string;
  pi_lastname: string;
  email: string;
  type: 'Proposal' | 'Experiment';
  firstname: string;
  lastname: string;
  title: string;
  abstract: string;
  startTime?: Date;
  endTime?: Date;
  instrumentIds: string[];
  MeasurementPeriodList: any[];
  metadata?: Record<string, unknown>;
};

export type UpdateScicatProposalDto = {
  ownerGroup?: string;
  accessGroups?: string[];
  parentProposalId?: string;
  pi_email?: string;
  pi_firstname?: string;
  pi_lastname?: string;
  email: string;
  firstname?: string;
  lastname?: string;
  type: 'Proposal' | 'Experiment';
  title: string;
  abstract?: string;
  startTime?: Date;
  endTime?: Date;
  instrumentIds: string[];
  MeasurementPeriodList?: any[];
  metadata?: Record<string, unknown>;
};

export type CreateScicatSampleDto = {
  proposalId: string;
  description: string;
  ownerGroup: string;
  accessGroups?: string[];
  isPublished?: boolean;
  sampleCharacteristics?: Record<string, any>;
};

export type UpdateScicatSampleDto = {
  sampleId?: string;
  description?: string;
  proposalId?: string;
  ownerGroup?: string;
  accessGroups?: string[];
  isPublished?: boolean;
  sampleCharacteristics?: Record<string, any>;
};
