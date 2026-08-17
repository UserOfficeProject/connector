import { ConsumerCallback } from '@user-office-software/duo-message-broker';

import { Event } from '../../../../../models/Event';
import { QueueConsumer } from '../../../QueueConsumer';
import { hasTriggeringType } from '../../../utils/hasTriggeringType';
import { validateExperimentMessage } from '../../../utils/validateExperimentMessage';
import { upsertExperimentInScicat } from '../consumerCallbacks/upsertProposalInScicat';

const EXPERIMENT_EVENT_TYPES = [
  Event.EXPERIMENT_CREATED,
  Event.EXPERIMENT_UPDATED,
  Event.EXPERIMENT_ESF_SUBMITTED,
];

export class ExperimentCreationQueueConsumer extends QueueConsumer {
  getQueueName(): string {
    return process.env.EXPERIMENT_CREATION_QUEUE_NAME as string;
  }

  getExchangeName(): string {
    return process.env.USER_OFFICE_CORE_EXCHANGE_NAME as string;
  }

  onMessage: ConsumerCallback = async (type, message) => {
    const hasExperimentType = hasTriggeringType(type, EXPERIMENT_EVENT_TYPES);

    if (!hasExperimentType) {
      return;
    }

    const experimentMessage = validateExperimentMessage(message);

    await upsertExperimentInScicat(experimentMessage);
  };
}
