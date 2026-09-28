export interface UOUser {
  id: number;
  firstname: string;
  lastname: string;
  preferredname?: string | null;
  institution?: string;
  email: string;
  oidcSub?: string | null;
  country?: string | null;
}

export interface UOInstrumentContact {
  id: number;
  firstname: string;
  lastname: string;
  preferredname?: string | null;
}

export interface UOInstrument {
  id: number;
  name: string;
  shortCode: string;
  instrumentContact?: UOInstrumentContact;
  managementTimeAllocation?: number;
}

export interface UOCall {
  id: number;
  shortCode: string;
  isActive: boolean;
  startCall: string;
  endCall: string;
  allocationTimeUnit?: string;
  proposalWorkflowId?: number;
}

export interface UOStatus {
  id: string;
  name: string;
  description?: string;
}

export interface UOProposalDto {
  proposalId: string;
  title: string;
  abstract: string;
  status: UOStatus;
  proposer: UOUser;
  users: UOUser[];
  dataAccessUsers: UOUser[];
  instruments: UOInstrument[];
  call: UOCall;
}
