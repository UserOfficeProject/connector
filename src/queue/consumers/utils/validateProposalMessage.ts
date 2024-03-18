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

  if (!proposalMessage.instrument) {
    throw new Error('Instrument is missing');
  }

  return proposalMessage as ValidProposalMessageData;
}
