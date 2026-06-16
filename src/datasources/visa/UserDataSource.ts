import { User } from '../../models/Visa';
import { ProposalUser } from '../../queue/consumers/scicat/scicatProposal/dto';
export interface UserUpdationEventPayload {
  id: number;
  user_title: string;
  firstname: string;
  middlename: string;
  lastname: string;
  preferredname: string;
  oidcSub: string;
  oauthRefreshToken: string;
  oauthAccessToken: string;
  oauthIssuer: string;
  nationality: number;
  organisation: number;
  email: string;
  emailVerified: boolean;
  placeholder: string;
  created: string;
  updated: string;
}

export interface UserDataSource {
  create(user: ProposalUser): Promise<User | null>;
  update(user: UserUpdationEventPayload): Promise<User>;
  delete(userId: number): Promise<number>;
}
