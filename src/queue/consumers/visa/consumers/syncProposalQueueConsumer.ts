import { logger } from '@user-office-software/duo-logger';
import { ConsumerCallback } from '@user-office-software/duo-message-broker';
import { container } from 'tsyringe';

import { Tokens } from '../../../../config/Tokens';
import { ProposalDataSource } from '../../../../datasources/visa/ProposalDataSource';
import { Event } from '../../../../models/Event';
import { ProposalMessageData } from '../../../../models/ProposalMessage';
import { isVisitMessage } from '../../oneidentity/utils/isVisitMessage';
import { QueueConsumer } from '../../QueueConsumer';
import { hasTriggeringProposalStatus } from '../../utils/hasTriggeringStatus';
import { hasTriggeringType } from '../../utils/hasTriggeringType';
import { validateProposalMessage } from '../../utils/validateProposalMessage';
import { syncVisaProposal } from '../consumerCallbacks/syncVisaProposal';
import { sanitizeProposalMessage } from '../utils/sanitizeProposalMessage';

const PROPOSAL_EVENTS_FOR_HANDLING = [
  Event.PROPOSAL_STATUS_ACTION_EXECUTED,
  Event.PROPOSAL_UPDATED,
];

const VISIT_EVENTS_FOR_HANDLING = [
  Event.VISIT_CREATED,
  Event.VISIT_UPDATED,
  Event.VISIT_DELETED,
];

const triggeringStatuses =
  process.env.VISA_SYNCING_TRIGGERING_STATUSES?.split(', ');

export class SyncProposalQueueConsumer extends QueueConsumer {
  protected getPrefetch(): number | undefined {
    return 1;
  }

  getQueueName(): string {
    return process.env.VISA_QUEUE_NAME as string;
  }
  getExchangeName(): string {
    return process.env.USER_OFFICE_CORE_EXCHANGE_NAME as string;
  }
  onMessage: ConsumerCallback = async (type, message) => {
    const isProposalEvent = hasTriggeringType(
      type,
      PROPOSAL_EVENTS_FOR_HANDLING
    );
    const isVisitEvent = hasTriggeringType(type, VISIT_EVENTS_FOR_HANDLING);
    if (!isProposalEvent && !isVisitEvent) {
      return;
    }

    logger.logInfo('VisaQueueConsumer', {
      type,
      message,
    });

    let proposalPayload: ProposalMessageData;
    if (isProposalEvent) {
      if (!hasTriggeringProposalStatus(message, triggeringStatuses)) {
        return;
      }

      proposalPayload = message as ProposalMessageData;
    } else {
      if (!isVisitMessage(message)) {
        throw new Error('Invalid Visit message received by VisaQueueConsumer');
      }

      proposalPayload = message.proposal;
    }

    const proposalMessage = validateProposalMessage(
      sanitizeProposalMessage(proposalPayload)
    );

    if (isVisitEvent) {
      const proposalDataSource = container.resolve<ProposalDataSource>(
        Tokens.VisaProposalDataSource
      );
      if (!(await proposalDataSource.get(proposalMessage.proposalPk))) {
        logger.logInfo(
          'Skipping Visa visit synchronization: proposal has not been synced to Visa; visit events only update existing proposals',
          {
            proposalPk: proposalMessage.proposalPk,
            type,
          }
        );

        return;
      }
    }

    await syncVisaProposal(proposalMessage);
  };
}
