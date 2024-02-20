/* eslint-disable @typescript-eslint/no-explicit-any */
import { MoodleMessageData } from '../../../models/MoodleMessage';
import { ProposalMessageData } from '../../../models/ProposalMessage';
export type ValidProposalMessageData = Required<ProposalMessageData>;

export function validateProposalMessage(
  proposalMessage: any
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

  if (!proposalMessage.instruments.length) {
    throw new Error('Instruments are missing');
  }

  proposalMessage.instruments.forEach((instrument: any) => {
    if (!instrument.id) {
      throw new Error('Instrument id is missing');
    }

    if (!instrument.shortCode) {
      throw new Error('Instrument short code is missing');
    }

    if (typeof instrument.allocatedTime !== 'number') {
      throw new Error('Instrument allocated time is missing');
    }
  });

  return proposalMessage as ValidProposalMessageData;
}

export function validateMoodleMessage(
  moodleMessage: MoodleMessageData
): ValidMoodleMessageData {
  if (!moodleMessage.enrolled_user_id) {
    throw new Error('Property userid is missing');
  }

  if (!moodleMessage.course_short_name) {
    throw new Error('Property courseid is missing');
  }

  return {
    enrolled_user_id: moodleMessage.enrolled_user_id,
    course_short_name: moodleMessage.course_short_name,
  };
}

// NOTE:
// context can be: instrument_shortCode, course_id
// item can be: (proposal_shortCode, user_id)
export type ValidMoodleMessageData = {
  enrolled_user_id: string;
  course_short_name: string;
};
