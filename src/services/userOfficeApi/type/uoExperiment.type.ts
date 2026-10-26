import { UOProposalDto, UOUser } from './uoProposal.type';

export interface UOExperimentSafetySample {
  sampleId: number;
  questionary: {
    steps: {
      fields: {
        question: {
          id: string;
          question: string;
        };
        value: string | number | boolean | null;
      }[];
    }[];
  };
  sample: {
    id: number;
    title: string;
  };
}
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
  localContact?: UOUser | null;
  visit?: {
    registrations: {
      status: string;
      user: UOUser | null;
    }[];
  } | null;
  experimentSafety?: {
    samples: UOExperimentSafetySample[];
  } | null;
}
