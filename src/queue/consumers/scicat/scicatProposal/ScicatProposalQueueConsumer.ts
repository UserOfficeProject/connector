import {
  ConsumerCallback,
  Queue,
} from '@user-office-software/duo-message-broker';

import { createChatroom, instantiateSynapseService4ChatRoom } from './consumerCallbacks/createChatroom';
import { upsertProposalInScicat } from './consumerCallbacks/upsertProposalInScicat';
import { proposalFoldersCreation } from './consumerCallbacks/proposalFoldersCreation';
import { Event } from '../../../../models/Event';
import { ProposalMessageData } from '../../../../models/ProposalMessage';
import { QueueConsumer } from '../../QueueConsumer';
import { str2Bool } from '../../../../config/utils';


const proposalTriggeringStatuses =
  process.env.SCICAT_PROPOSAL_TRIGGERING_STATUSES?.split(', ');

const folderCreationTriggeringStatuses =
  process.env.PROPOSAL_FOLDERS_CREATION_TRIGGERING_STATUSES?.split(', ');

const rabbitmqQueue = process.env.RABBITMQ_QUEUE as Queue || Queue.SCICAT_PROPOSAL;

export type ValidProposalMessageData = Required<ProposalMessageData>;

const containsScicatProposalCreationTriggeringStatus = (proposalMessage: ProposalMessageData) => {
  if (!proposalMessage.newStatus || !proposalTriggeringStatuses) {
    return false;
  }

  // NOTE: If new status is not one of the triggering statuses
  if (proposalTriggeringStatuses.indexOf(proposalMessage.newStatus) === -1) {
    return false;
  }

  return true;
};

const containsProposalFoldersCreationTriggeringStatus = (proposalMessage: ProposalMessageData) => {
  if (!proposalMessage.newStatus || !folderCreationTriggeringStatuses) {
    return false;
  }

  // NOTE: If new status is not one of the triggering statuses
  if (folderCreationTriggeringStatuses.indexOf(proposalMessage.newStatus) === -1) {
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

const enableSciChatRoomCreation = str2Bool(process.env.ENABLE_SCICHAT_ROOM_CREATION as string);

export class ScicatProposalQueueConsumer extends QueueConsumer {
  constructor() {
    super(rabbitmqQueue);
    if ( enableSciChatRoomCreation ) {
      instantiateSynapseService4ChatRoom();
    }
  }

  onMessage: ConsumerCallback = async (type, message) => {
    if (EVENT_TYPES.includes(type as Event) === false) {
      return;
    }


    const proposalMessage = validateProposalMessage(
      message as ProposalMessageData
    );

    if (
      (
        str2Bool(process.env.ENABLE_SCICAT_PROPOSAL_UPSERT as string) ||
        enableSciChatRoomCreation ) && 
      (
        containsScicatProposalCreationTriggeringStatus(message as ProposalMessageData)
      )
    ) {
      upsertProposalInScicat(proposalMessage);
      createChatroom(proposalMessage);
    }
    if (
      str2Bool(process.env.ENABLE_PROPOSAL_FOLDERS_CREATION as string) && 
      containsProposalFoldersCreationTriggeringStatus(message as ProposalMessageData)
    ) {
      proposalFoldersCreation(proposalMessage);
    }

    return;
  };
}
