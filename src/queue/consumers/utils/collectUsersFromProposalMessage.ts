import { ProposalMessageData } from '../../../models/ProposalMessage';
import { ProposalUser } from '../scicat/scicatProposal/dto';

export function collectUsersFromProposalMessage(
  proposalMessage: ProposalMessageData
): ProposalUser[] {
  return [...proposalMessage.members, proposalMessage.proposer].filter(
    (user): user is ProposalUser => user !== undefined
  );
}
