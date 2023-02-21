import { ConsumerCallback } from '@user-office-software/duo-message-broker';

import { Event } from '../../../../../models/Event';
import { ProposalMessageData } from '../../../../../models/ProposalMessage';
import { QueueConsumer } from '../../../QueueConsumer';
import { proposalFoldersCreation } from '../consumerCallbacks/proposalFoldersCreation';
import { hasTriggeringStatus } from '../utils/hasTriggeringStatus';
import { hasTriggeringType } from '../utils/hasTriggeringType';
import { validateProposalMessage } from '../utils/validateProposalMessage';

const EVENT_TYPES = [
  Event.PROPOSAL_STATUS_CHANGED_BY_WORKFLOW,
  Event.PROPOSAL_STATUS_CHANGED_BY_USER,
];
const triggeringStatuses =
  process.env.PROPOSAL_FOLDERS_CREATION_TRIGGERING_STATUSES?.split(', ');

export class FolderCreationQueueConsumer extends QueueConsumer {
  getQueueName(): string {
    return process.env.FOLDER_CREATION_QUEUE_NAME as string;
  }

  onMessage: ConsumerCallback = async (type, message) => {
    const proposalMessage = validateProposalMessage(
      message as ProposalMessageData
    );

    const hasStatus = hasTriggeringStatus(proposalMessage, triggeringStatuses);
    const hasType = hasTriggeringType(type, EVENT_TYPES);

    if (hasStatus && hasType) {
      proposalFoldersCreation(proposalMessage);
    }
  };
}
