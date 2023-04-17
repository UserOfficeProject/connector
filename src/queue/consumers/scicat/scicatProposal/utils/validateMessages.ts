import { MoodleMessageData } from '../../../../../models/MoodleMessage';
import { ProposalMessageData } from '../../../../../models/ProposalMessage';
export type ValidProposalMessageData = Required<ProposalMessageData>;

export function validateProposalMessage(
  proposalMessage: ProposalMessageData
): ValidProposalMessageData {
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

  if (!proposalMessage.instrument) {
    throw new Error('Instrument is missing');
  }

  return proposalMessage as ValidProposalMessageData;
}

export function validateMoodleMessage(
  moodleMessage: MoodleMessageData
): ValidMessageData {
  if (!moodleMessage.userid) {
    throw new Error('Property userid is missing');
  }

  if (!moodleMessage.courseid) {
    throw new Error('Property courseid is missing');
  }

  return { context: moodleMessage.courseid, item: moodleMessage.userid };
}

// NOTE:
// context can be: instrument_shortCode, course_id
// item can be: (proposal_shortCode, user_id)
export type ValidMessageData = {
  context: string;
  item: string;
};
