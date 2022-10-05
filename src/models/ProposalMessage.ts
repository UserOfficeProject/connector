export type ProposalMessageData = {
  proposalPk: number;
  shortCode: string;
  title: string;
  abstract: string;
  newStatus?: string;
  members: { firstName: string; lastName: string; email: string; id: string }[];
  proposer?: { firstName: string; lastName: string; email: string; id: string };
};
