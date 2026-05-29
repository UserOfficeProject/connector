import { ExperimentMessageData } from '../../../models/ProposalMessage';

export type ValidExperimentMessageData = Required<ExperimentMessageData>;

export function validateExperimentMessage(
  message: Record<string, unknown>
): ValidExperimentMessageData {
  if (!message.experimentId) {
    throw new Error('Experiment ID is missing');
  }

  if (!message.experimentPk) {
    throw new Error('Experiment primary key is missing');
  }

  if (!message.startsAt) {
    throw new Error('Experiment start date is missing');
  }

  if (!message.endsAt) {
    throw new Error('Experiment end date is missing');
  }

  if (!message.status) {
    throw new Error('Experiment status is missing');
  }

  return message as unknown as ValidExperimentMessageData;
}
