import { UOProposalDto, UOUser } from './uoProposal.type';

export interface UOExperimentDto {
  experimentId: string;
  startsAt: string;
  status: string;
  endsAt: string;
  instrument: {
    id: number;
    name: string;
    shortCode: string;
  };
  proposal: Pick<
    UOProposalDto,
    'proposalId' | 'title' | 'abstract' | 'status' | 'proposer'
  >;
  visit?: {
    registrations: {
      status: string;
      user: UOUser | null;
    }[];
  } | null;
}
