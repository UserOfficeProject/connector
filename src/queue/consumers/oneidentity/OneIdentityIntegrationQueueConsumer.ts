import { logger } from '@user-office-software/duo-logger';
import { ConsumerCallback } from '@user-office-software/duo-message-broker';
import { isAxiosError } from 'axios';

import { syncProposalAndMembersToOneIdentityHandler } from './consumerCallbacks/syncProposalAndMembersToOneIdentityHandler';
import { syncVisitorToOneIdentityHandler } from './consumerCallbacks/syncVisitorToOneIdentityHandler';
import { validateProposalMessage } from './utils/validateProposalMessage';
import { Event } from '../../../models/Event';
import { QueueConsumer } from '../QueueConsumer';
import { hasTriggeringType } from '../utils/hasTriggeringType';
import { validateVisitorMessage } from './utils/validateVisitorMessage';

const ONE_IDENTITY_INTEGRATION_QUEUE_NAME =
  process.env.ONE_IDENTITY_INTEGRATION_QUEUE_NAME || '';
const USER_OFFICE_CORE_EXCHANGE_NAME =
  process.env.USER_OFFICE_CORE_EXCHANGE_NAME || '';

// Events that trigger the handling of syncing proposals and members to One Identity
const SYNC_PROPOSAL_AND_MEMBERS_EVENTS_FOR_HANDLING = [
  Event.PROPOSAL_ACCEPTED,
  Event.PROPOSAL_UPDATED,
];

// Events that trigger the handling of syncing visitors to One Identity
const SYNC_VISITOR_EVENTS_FOR_HANDLING = [
  Event.VISITOR_CREATED,
  Event.VISITOR_DELETED,
];

// Class for consuming messages from the ESS One Identity Integration Queue
export class OneIdentityIntegrationQueueConsumer extends QueueConsumer {
  getQueueName(): string {
    return ONE_IDENTITY_INTEGRATION_QUEUE_NAME;
  }

  getExchangeName(): string {
    return USER_OFFICE_CORE_EXCHANGE_NAME;
  }

  onMessage: ConsumerCallback = async (type, message) => {
    const eventType = type as Event;
    const isProposalEvent = hasTriggeringType(
      eventType,
      SYNC_PROPOSAL_AND_MEMBERS_EVENTS_FOR_HANDLING
    );
    const isVisitorEvent = hasTriggeringType(
      eventType,
      SYNC_VISITOR_EVENTS_FOR_HANDLING
    );

    if (!isProposalEvent && !isVisitorEvent) return;

    logger.logInfo('OneIdentityIntegrationQueueConsumer', {
      type,
      message,
    });

    try {
      if (isProposalEvent) {
        const proposalMessage = validateProposalMessage(message);
        await syncProposalAndMembersToOneIdentityHandler(
          proposalMessage,
          eventType
        );
      } else if (isVisitorEvent) {
        const visitorMessage = validateVisitorMessage(message);
        await syncVisitorToOneIdentityHandler(visitorMessage, eventType);
      }

      logger.logInfo('Message handled by OneIdentityIntegrationQueueConsumer', {
        type,
        message,
      });
    } catch (error) {
      const response = extractAxiosErrorResponse(error);

      logger.logException(
        'Error while handling message in OneIdentityIntegrationQueueConsumer',
        error,
        {
          type,
          message,
          response,
        }
      );

      // Re-throw the error to make sure the message is not acknowledged
      throw error;
    }
  };
}

function extractAxiosErrorResponse(error: unknown) {
  if (isAxiosError(error)) {
    return {
      status: error.response?.status,
      headers: error.response?.headers,
      data: error.response?.data,
    };
  }

  return undefined;
}
