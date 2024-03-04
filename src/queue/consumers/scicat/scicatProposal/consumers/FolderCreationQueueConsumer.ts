import { ConsumerCallback } from '@user-office-software/duo-message-broker';

import { Event } from '../../../../../models/Event';
import { ProposalMessageData } from '../../../../../models/ProposalMessage';
import { QueueConsumer } from '../../../QueueConsumer';
import { hasTriggeringStatus } from '../../../utils/hasTriggeringStatus';
import { hasTriggeringType } from '../../../utils/hasTriggeringType';
import { validateProposalMessage } from '../../../utils/validateMessages';
import { proposalFoldersCreation } from '../consumerCallbacks/proposalFoldersCreation';

const EVENT_TYPES = [
  Event.PROPOSAL_STATUS_CHANGED_BY_WORKFLOW,
  Event.PROPOSAL_STATUS_CHANGED_BY_USER,
  Event.PROPOSAL_STATUS_ACTION_EXECUTED,
];
const triggeringStatuses =
  process.env.PROPOSAL_FOLDERS_CREATION_TRIGGERING_STATUSES?.split(', ');

export class FolderCreationQueueConsumer extends QueueConsumer {
  getQueueName(): string {
    return process.env.FOLDER_CREATION_QUEUE_NAME as string;
  }

  getExchangeName(): string {
    return process.env.USER_OFFICE_CORE_EXCHANGE_NAME as string;
  }

  onMessage: ConsumerCallback = async (arg0, message, properties) => {
    const type = properties?.headers?.type || arg0;
    const hasType = hasTriggeringType(type, EVENT_TYPES);

    if (!hasType) {
      return;
    }

    const proposalMessage = validateProposalMessage(
      message as ProposalMessageData
    );

    const hasStatus = hasTriggeringStatus(proposalMessage, triggeringStatuses);

    if (hasStatus) {
      proposalFoldersCreation(proposalMessage);
    }
  };
}
