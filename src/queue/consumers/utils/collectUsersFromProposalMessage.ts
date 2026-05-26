import { ProposalMessageData } from '../../../models/ProposalMessage';
import { ProposalUser } from '../scicat/scicatProposal/dto';

export function collectUsersFromProposalMessage({
  members,
  proposer,
  dataAccessUsers = [],
  visitors = [],
}: ProposalMessageData): ProposalUser[] {
  return [...members, proposer, ...dataAccessUsers, ...visitors].filter(
    (user): user is ProposalUser => user !== undefined
  );
}
