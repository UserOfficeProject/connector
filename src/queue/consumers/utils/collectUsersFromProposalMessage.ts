import { ProposalMessageData } from '../../../models/ProposalMessage';
import { ProposalUser } from '../scicat/scicatProposal/dto';

export function collectUsersFromProposalMessage({
  members,
  proposer,
  dataAccessUsers = [],
}: ProposalMessageData): ProposalUser[] {
  return [...members, proposer, ...dataAccessUsers].filter(
    (user): user is ProposalUser => user !== undefined
  );
}
