import { logger } from '@user-office-software/duo-logger';
import { ConsumerCallback } from '@user-office-software/duo-message-broker';

import { oneIdentityIntegrationHandler } from './consumerCallbacks/oneIdentityIntegrationHandler';
import { isProposalMessageData } from './utils/isProposalMessageData';
import { Event } from '../../../models/Event';
import { QueueConsumer } from '../QueueConsumer';

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
    if (!EVENTS_FOR_HANDLING.includes(type as Event)) {
      return;
    }

    logger.logInfo('OneIdentityIntegrationQueueConsumer', {
      type,
      message,
    });

    if (!isProposalMessageData(message)) {
      logger.logError('Invalid message', {
        message,
      });

      return;
    }

    try {
      await oneIdentityIntegrationHandler(message, type as Event);

      logger.logInfo('Message handled', {
        type,
        message,
      });
    } catch (error) {
      logger.logException('Error while handling proposal', error, {
        type,
        message,
      });
    }
  };
}
