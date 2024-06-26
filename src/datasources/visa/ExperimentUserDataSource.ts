import { ExperimentUser, User } from '../../models/Visa';

export interface ExperimentUserDataSource {
  create({
    experimentId,
    userId,
  }: {
    experimentId: string;
    userId: string;
  }): Promise<ExperimentUser>;
  delete({
    experimentId,
    userId,
  }: {
    experimentId: string;
    userId: string;
  }): Promise<number>;
  getAllUsersByExperimentId(experimentId: string): Promise<User[]>;
}
