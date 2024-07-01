import { Experiment } from '../../models/Visa';

export interface ExperimentDataSource {
  getByProposalId(proposalId: number): Promise<Experiment | null>;
  create({
    proposalPk,
    instrumentId,
  }: {
    proposalPk: number;
    instrumentId: number;
  }): Promise<Experiment>;
}
