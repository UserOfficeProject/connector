import { ProposalMessageData } from '../../../../models/ProposalMessage';

// For OneIdentity integration, we need these fields to be present in the message
export function isProposalMessageData(
  message: Record<string, unknown>
): message is ProposalMessageData {
  return message?.shortCode !== undefined && message?.members !== undefined;
}
