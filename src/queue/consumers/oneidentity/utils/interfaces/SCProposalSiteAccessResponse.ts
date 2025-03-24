import { PersonWantsOrg } from './PersonWantsOrg';

export interface SiteAccessResponse {
  IsSuccess: boolean;
  Message: string | null;
}

export interface SCProposalSiteAccessResponse extends SiteAccessResponse {
  Data: PersonWantsOrg[];
}

export interface SCProposalSiteAccessCancelResponse extends SiteAccessResponse {
  Data: [];
}
