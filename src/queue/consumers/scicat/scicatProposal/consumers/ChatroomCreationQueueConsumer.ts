import { ConsumerCallback } from '@user-office-software/duo-message-broker';

import { Event } from '../../../../../models/Event';
import { ProposalMessageData } from '../../../../../models/ProposalMessage';
import { QueueConsumer } from '../../../QueueConsumer';
import { createChatroom } from '../consumerCallbacks/createChatroom';
import { hasTriggeringStatus } from '../utils/hasTriggeringStatus';
import { hasTriggeringType } from '../utils/hasTriggeringType';
import { validateProposalMessage } from '../utils/validateProposalMessage';

const EVENT_TYPES = [
  Event.PROPOSAL_STATUS_CHANGED_BY_WORKFLOW,
  Event.PROPOSAL_STATUS_CHANGED_BY_USER,
];
const triggeringStatuses =
  process.env.SCICAT_PROPOSAL_TRIGGERING_STATUSES?.split(', ');

export class ChatroomCreationQueueConsumer extends QueueConsumer {
  getQueueName(): string {
    return 'consumer.chatroom_creation.queue';
  }

  onMessage: ConsumerCallback = async (type, message) => {
    const proposalMessage = validateProposalMessage(
      message as ProposalMessageData
    );

    const hasStatus = hasTriggeringStatus(proposalMessage, triggeringStatuses);
    const hasType = hasTriggeringType(type, EVENT_TYPES);

    if (hasStatus && hasType) {
      createChatroom(proposalMessage);
    }
  };
}