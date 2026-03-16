import { ProposalMessageData } from '../../../../models/ProposalMessage';

// For OneIdentity, only these fields are required
export function validateProposalMessage(
  message: any
): ProposalMessageData | never {
  if (
    message?.shortCode === undefined ||
    message?.proposer === undefined ||
    message?.members === undefined
  ) {
    throw new Error('Invalid proposal message');
  }

  return message;
}
