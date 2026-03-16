import { Proposal } from '../../../models/Visa';
import { ValidProposalMessageData } from '../../../queue/consumers/utils/validateProposalMessage';
import { ProposalDataSource } from '../ProposalDataSource';

export default class MockProposalDataSource implements ProposalDataSource {
  get(id: number): Promise<Proposal | null> {
    throw new Error('Method not implemented.');
  }
  async create(proposal: ValidProposalMessageData): Promise<Proposal> {
    throw new Error('Method not implemented.');
  }

  async update(proposal: ValidProposalMessageData): Promise<Proposal> {
    throw new Error('Method not implemented.');
  }

  async delete(id: number): Promise<number> {
    throw new Error('Method not implemented.');
  }
}
