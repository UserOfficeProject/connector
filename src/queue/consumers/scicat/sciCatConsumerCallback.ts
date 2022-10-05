import { logger } from '@user-office-software/duo-logger';
import { ConsumerCallback } from '@user-office-software/duo-message-broker';

import { Event } from '../../../models/Event';
import { handleProposalStatusChange } from './sciCatMessageHandlers';

const sciCatConsumerCallback: ConsumerCallback = async (
  type,
  message,
  properties
) => {
  const handler = sciCatHandlers.get(type as Event);
  if (handler) {
    await handler(type, message, properties);
  } else {
    logger.logError('No handler for event type', { type, message });
  }
};

const sciCatHandlers: Map<Event, ConsumerCallback> = new Map();
sciCatHandlers.set(
  Event.PROPOSAL_STATUS_CHANGED_BY_WORKFLOW,
  handleProposalStatusChange
);
sciCatHandlers.set(
  Event.PROPOSAL_STATUS_CHANGED_BY_USER,
  handleProposalStatusChange
);

export { sciCatConsumerCallback };
