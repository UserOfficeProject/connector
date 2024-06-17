import { logger } from '@user-office-software/duo-logger';
import { ConsumerCallback } from '@user-office-software/duo-message-broker';

import { Event } from '../../../../models/Event';
import { QueueConsumer } from '../../QueueConsumer';
import { hasTriggeringStatus } from '../../utils/hasTriggeringStatus';
import { hasTriggeringType } from '../../utils/hasTriggeringType';
import { validateProposalMessage } from '../../utils/validateProposalMessage';
import { syncVisaProposal } from '../consumerCallbacks/syncVisaProposal';

const EVENTS_FOR_HANDLING = [
  Event.PROPOSAL_STATUS_CHANGED_BY_WORKFLOW,
  Event.PROPOSAL_STATUS_CHANGED_BY_USER,
  Event.PROPOSAL_STATUS_ACTION_EXECUTED,
];

const triggeringStatuses =
  process.env.PROPOSAL_FOLDERS_CREATION_TRIGGERING_STATUSES?.split(', ');

export class SyncProposalQueueConsumer extends QueueConsumer {
  getQueueName(): string {
    return process.env.VISA_QUEUE_NAME as string;
  }
  getExchangeName(): string {
    return process.env.USER_OFFICE_CORE_EXCHANGE_NAME as string;
  }
  onMessage: ConsumerCallback = async (type, message) => {
    console.log(
      '===================Message received in SyncProposalQueueConsumer==================='
    );
    if (!hasTriggeringType(type, EVENTS_FOR_HANDLING)) {
      return;
    }

    logger.logInfo('VisaQueueConsumer', {
      type,
      message,
    });
    console.log('Checkpoint1');
    console.log({ EVENTS_FOR_HANDLING, type });

    const hasStatus = hasTriggeringStatus(message, triggeringStatuses);

    if (!hasStatus) {
      return;
    }
    console.log('Checkpoint2');
    const proposalMessage = validateProposalMessage(message);

    syncVisaProposal(proposalMessage);
    console.log(
      '===================SyncProposalQueueConsumer DONE==================='
    );
  };
}
