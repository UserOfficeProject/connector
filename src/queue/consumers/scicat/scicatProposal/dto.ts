export type CreateProposalDto = {
  ownerGroup: string;
  accessGroups: string[];
  proposalId: string;
  pi_email: string;
  pi_firstname: string;
  pi_lastname: string;
  email: string;
  firstname: string;
  lastname: string;
  title: string;
  abstract: string;
  startTime?: Date;
  endTime?: Date;
  MeasurementPeriodList: any[];
};

export type UpdateProposalDto = {
  ownerGroup?: string;
  accessGroups?: string[];
  pi_email?: string;
  pi_firstname?: string;
  pi_lastname?: string;
  email: string;
  firstname?: string;
  lastname?: string;
  title: string;
  abstract?: string;
  startTime?: Date;
  endTime?: Date;
  MeasurementPeriodList?: any[];
};

export interface Institution {
  id: number;
  name: string;
  country?: number;
  verified: boolean;
  rorId?: string;
}

export interface Country {
  countryId?: number;
  country?: string;
}

export interface ProposalUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  oidcSub: string;
  oauthIssuer?: string;
  institution?: Institution;
  country?: Country;
}

export interface ProposalAcceptedMessage {
  proposalId: number;
  shortCode: string;
  title: string;
  members: ProposalUser[];
  proposer?: ProposalUser;
}

export type ChatRoom = {
  canonical_alias: string;
  name: string;
  room_id: string;
  creator: string;
  guest_access: string;
  history_visibility: string;
  join_rules: string;
  public: boolean;
};

export type UserId = {
  user_id: string;
};
