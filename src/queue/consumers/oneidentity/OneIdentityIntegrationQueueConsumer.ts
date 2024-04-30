import { logger } from '@user-office-software/duo-logger';
import { ConsumerCallback } from '@user-office-software/duo-message-broker';

import { oneIdentityIntegrationHandler } from './consumerCallbacks/oneIdentityIntegrationHandler';
import { validateRequiredProposalMessageFields } from './utils/validateRequiredProposalMessageFields';
import { Event } from '../../../models/Event';
import { QueueConsumer } from '../QueueConsumer';
import { hasTriggeringType } from '../utils/hasTriggeringType';

const ONE_IDENTITY_INTEGRATION_QUEUE_NAME =
  process.env.ONE_IDENTITY_INTEGRATION_QUEUE_NAME || '';
const USER_OFFICE_CORE_EXCHANGE_NAME =
  process.env.USER_OFFICE_CORE_EXCHANGE_NAME || '';
const EVENTS_FOR_HANDLING = [Event.PROPOSAL_ACCEPTED, Event.PROPOSAL_UPDATED];

// Class for consuming messages from the ESS One Identity Integration Queue
export class OneIdentityIntegrationQueueConsumer extends QueueConsumer {
  getQueueName(): string {
    return ONE_IDENTITY_INTEGRATION_QUEUE_NAME;
  }

  getExchangeName(): string {
    return USER_OFFICE_CORE_EXCHANGE_NAME;
  }

  onMessage: ConsumerCallback = async (type, message) => {
    if (!hasTriggeringType(type, EVENTS_FOR_HANDLING)) {
      return;
    }

    logger.logInfo('OneIdentityIntegrationQueueConsumer', {
      type,
      message,
    });

    try {
      const proposalMessage = validateRequiredProposalMessageFields(message);

      await oneIdentityIntegrationHandler(proposalMessage, type as Event);

      logger.logInfo('Message handled', {
        type,
        message,
      });
    } catch (error) {
      logger.logException('Error while handling proposal', error, {
        type,
        message,
      });

      // Re-throw the error to make sure the message is not acknowledged
      throw error;
    }
  };
}
