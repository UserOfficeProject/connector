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

export interface Threepid {
  medium: string;
  address: string;
  added_at: number;
  validated_at: number;
}

export interface ExternalId {
  auth_provider: string;
  external_id: string;
}

export interface SynapseUser {
  name: string; // Fully-qualified user ID (e.g., @user:example.com)
  displayname: string | null; // User's display name, can be null if not set
  threepids: Threepid[]; // List of third-party IDs (e.g., emails)
  avatar_url: string | null; // User's avatar URL, can be null if not set
  is_guest: boolean; // Whether the user is a guest
  admin: boolean; // Whether the user is a server administrator
  deactivated: boolean; // Whether the user is deactivated
  erased: boolean; // Whether the user is marked as erased (GDPR)
  shadow_banned: boolean; // Whether the user is shadow banned
  creation_ts: number; // User's creation timestamp (in ms since Unix epoch)
  appservice_id: string | null; // ID of the appservice that registered the user, or null
  consent_server_notice_sent: string | null; // Consent notice version, or null
  consent_version: string | null; // Consent version, or null
  consent_ts: number | null; // Consent timestamp, or null
  external_ids: ExternalId[]; // List of external IDs associated with the user
  user_type: string | null; // Type of user (e.g., bot, support), or null
  locked: boolean;
}
