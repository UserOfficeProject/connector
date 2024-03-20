import { ProposalMessageData } from '../../../../models/ProposalMessage';

// For OneIdentity, only these fields are required
export function validateRequiredProposalMessageFields(
  message: any
): ProposalMessageData | never {
  if (
    typeof message !== 'object' ||
    message === null ||
    message?.shortCode === undefined ||
    message?.proposer === undefined ||
    message?.members === undefined
  ) {
    throw new Error('Invalid proposal message');
  }

  return message as ProposalMessageData;
}
