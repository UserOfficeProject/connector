import {
  ConsumerCallback,
  Queue,
} from '@user-office-software/duo-message-broker';

import { Event } from '../../../../models/Event';
import { ProposalMessageData } from '../../../../models/ProposalMessage';
import { QueueConsumer } from '../../QueueConsumer';
import { createChatroom } from './consumerCallbacks/createChatroom';

const proposalTriggeringStatuses =
  process.env.SCICAT_PROPOSAL_TRIGGERING_STATUSES?.split(', ');

export type ValidProposalMessageData = Required<ProposalMessageData>;

const containsTriggeringStatus = (proposalMessage: ProposalMessageData) => {
  if (!proposalMessage.newStatus || !proposalTriggeringStatuses) {
    return false;
  }

  // NOTE: If new status is not one of the triggering statuses
  if (proposalTriggeringStatuses.indexOf(proposalMessage.newStatus) === -1) {
    return false;
  }

  return true;
};

const validateProposalMessage = (
  proposalMessage: ProposalMessageData
): ValidProposalMessageData => {
  if (!proposalMessage.title) {
    throw new Error('Proposal title is missing');
  }

  if (!proposalMessage.proposer) {
    throw new Error('Proposal proposer is missing');
  }

  if (!proposalMessage.proposer.firstName) {
    throw new Error('Proposal proposer first name is missing');
  }

  if (!proposalMessage.proposer.lastName) {
    throw new Error('Proposal proposer last name is missing');
  }

  if (!proposalMessage.proposer.email) {
    throw new Error('Proposal proposer email is missing');
  }

  if (!proposalMessage.abstract) {
    throw new Error('Proposal abstract is missing');
  }

  if (!proposalMessage.shortCode) {
    throw new Error('Proposal short code is missing');
  }

  return proposalMessage as ValidProposalMessageData;
};

const EVENT_TYPES = [
  Event.PROPOSAL_STATUS_CHANGED_BY_WORKFLOW,
  Event.PROPOSAL_STATUS_CHANGED_BY_USER,
];
export class ScicatProposalQueueConsumer extends QueueConsumer {
  getQueueName(): Queue {
    return Queue.SCICAT_PROPOSAL;
  }

  onMessage: ConsumerCallback = async (type, message) => {
    if (EVENT_TYPES.includes(type as Event) === false) {
      return;
    }

    if (!containsTriggeringStatus(message as ProposalMessageData)) {
      return;
    }

    const proposalMessage = validateProposalMessage(
      message as ProposalMessageData
    );

    //upsertProposalInScicat(proposalMessage);
    createChatroom(proposalMessage);
  };
}
