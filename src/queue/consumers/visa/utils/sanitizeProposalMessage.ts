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
    dataAccessUsers: proposalMessage.dataAccessUsers.map((user) => ({
      ...user,
      oidcSub: user.oidcSub.toLowerCase(),
      email: user.email.toLowerCase(),
    })),
    visitors: proposalMessage.visitors.map((visitor) => ({
      ...visitor,
      oidcSub: visitor.oidcSub.toLowerCase(),
      email: visitor.email.toLowerCase(),
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
