import { ProposalMessageData } from '../../../../../models/ProposalMessage';

export const hasTriggeringStatus = (
  message: ProposalMessageData,
  statuses: string[] | undefined
) => {
  if (!message.newStatus || !statuses) {
    return false;
  }

  // NOTE: If new status is not one of the triggering statuses
  if (statuses.indexOf(message.newStatus) === -1) {
    return false;
  }

  return true;
};
