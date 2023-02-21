import { ProposalUser } from './../queue/consumers/scicat/scicatProposal/dto';
export type ProposalMessageData = {
  proposalPk: number;
  shortCode: string;
  title: string;
  abstract: string;
  newStatus?: string;
  members: ProposalUser[];
  proposer?: ProposalUser;
};
