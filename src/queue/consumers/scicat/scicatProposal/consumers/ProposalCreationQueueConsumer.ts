import { ConsumerCallback } from '@user-office-software/duo-message-broker';

import { Event } from '../../../../../models/Event';
import { QueueConsumer } from '../../../QueueConsumer';
import { hasTriggeringStatus } from '../../../utils/hasTriggeringStatus';
import { hasTriggeringType } from '../../../utils/hasTriggeringType';
import { validateExperimentMessage } from '../../../utils/validateExperimentMessage';
import { validateProposalMessage } from '../../../utils/validateProposalMessage';
import {
  upsertExperimentInScicat,
  upsertProposalInScicat,
} from '../consumerCallbacks/upsertProposalInScicat';

const EVENT_TYPES = [
  Event.PROPOSAL_STATUS_ACTION_EXECUTED,
  Event.PROPOSAL_UPDATED,
  Event.EXPERIMENT_CREATED,
  Event.EXPERIMENT_UPDATED,
];

const triggeringStatuses =
  process.env.SCICAT_PROPOSAL_TRIGGERING_STATUSES?.split(', ');

export class ProposalCreationQueueConsumer extends QueueConsumer {
  getQueueName(): string {
    return process.env.PROPOSAL_CREATION_QUEUE_NAME as string;
  }

  getExchangeName(): string {
    return process.env.USER_OFFICE_CORE_EXCHANGE_NAME as string;
  }

  onMessage: ConsumerCallback = async (type, message) => {
    const hasType = hasTriggeringType(type, EVENT_TYPES);

    if (!hasType) {
      return;
    }

    const hasStatus = hasTriggeringStatus(message, triggeringStatuses);

    if (!hasStatus) {
      return;
    }

    const isExperiment =
      type === Event.EXPERIMENT_CREATED || type === Event.EXPERIMENT_UPDATED;

    if (isExperiment) {
      const experimentMessage = validateExperimentMessage(message);
      upsertExperimentInScicat(experimentMessage);
    } else {
      const proposalMessage = validateProposalMessage(message);
      upsertProposalInScicat(proposalMessage);
    }
  };
}
