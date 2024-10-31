import { ProposalMessageData } from '../../../../models/ProposalMessage';

/* eslint-disable @typescript-eslint/no-explicit-any */

export function sanitizeProposalMessage(proposalMessage: ProposalMessageData) {
  return {
    ...proposalMessage,
    members: proposalMessage.members.map((member) => ({
      ...member,
      oidcSub: member.oidcSub.toLowerCase(),
      email: member.email.toLowerCase(),
    })),
    proposer: proposalMessage.proposer
      ? {
          ...proposalMessage.proposer,
          oidcSub: proposalMessage.proposer.oidcSub.toLowerCase(),
          email: proposalMessage.proposer.email.toLowerCase(),
        }
      : undefined,
  };
}
