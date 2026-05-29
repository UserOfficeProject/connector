import { ConsumerCallback } from '@user-office-software/duo-message-broker';

import { Event } from '../../../../../models/Event';
import { QueueConsumer } from '../../../QueueConsumer';
import { hasTriggeringProposalStatus } from '../../../utils/hasTriggeringStatus';
import { hasTriggeringType } from '../../../utils/hasTriggeringType';
import { validateProposalMessage } from '../../../utils/validateProposalMessage';
import { upsertProposalInScicat } from '../consumerCallbacks/upsertProposalInScicat';

const PROPOSAL_EVENT_TYPES = [
  Event.PROPOSAL_STATUS_ACTION_EXECUTED,
  Event.PROPOSAL_UPDATED,
];

const proposalTriggeringStatuses =
  process.env.SCICAT_PROPOSAL_TRIGGERING_STATUSES?.split(', ');

export class ProposalCreationQueueConsumer extends QueueConsumer {
  getQueueName(): string {
    return process.env.PROPOSAL_CREATION_QUEUE_NAME as string;
  }

  getExchangeName(): string {
    return process.env.USER_OFFICE_CORE_EXCHANGE_NAME as string;
  }

  onMessage: ConsumerCallback = async (type, message) => {
    const hasProposalType = hasTriggeringType(type, PROPOSAL_EVENT_TYPES);

    if (!hasProposalType) {
      return;
    }

    const hasProposalStatus = hasTriggeringProposalStatus(
      message,
      proposalTriggeringStatuses
    );

    if (!hasProposalStatus) {
      return;
    }

    const proposalMessage = validateProposalMessage(message);
    upsertProposalInScicat(proposalMessage);
  };
}
