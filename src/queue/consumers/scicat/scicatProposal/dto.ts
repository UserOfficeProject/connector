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

export interface ProposalUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  oidcSub: string;
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
