/* eslint-disable @typescript-eslint/no-explicit-any */
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

  if (!proposalMessage.callId) {
    throw new Error('Proposal CallId is missing');
  }

  if (!proposalMessage.submitted) {
    throw new Error('Proposal Submitted status is missing');
  }

  if (!proposalMessage.shortCode) {
    throw new Error('Proposal short code is missing');
  }

  if (!proposalMessage.instruments?.length) {
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
