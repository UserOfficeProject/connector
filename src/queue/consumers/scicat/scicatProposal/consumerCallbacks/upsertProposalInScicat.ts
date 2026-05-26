import { logger } from '@user-office-software/duo-logger';

import { upsertSamplesInScicat } from './upsertSampleInScicat';
import {
  ExperimentMessageData,
  ProposalMessageData,
} from '../../../../../models/ProposalMessage';
import {
  fetchUoExperiment,
  fetchUoProposal,
} from '../../../../../services/userOfficeApi/uoApi';
import { scicatApi } from '../utils/scicatApi';

export const upsertProposalInScicat = async (
  proposalMessage: ProposalMessageData
) => {
  const proposal = await fetchUoProposal(proposalMessage.proposalPk);
  const exists = await scicatApi.checkProposalExists(proposal.proposalId);

  if (exists) {
    logger.logInfo('Proposal already exists, updating...', {
      proposalId: proposal.proposalId,
    });
    await scicatApi.updateProposal(proposal);
  } else {
    logger.logInfo('Proposal does not exist yet, creating...', {
      proposalId: proposal.proposalId,
    });
    await scicatApi.createProposal(proposal);
  }
};

export const upsertExperimentInScicat = async (
  experimentMessage: ExperimentMessageData
) => {
  const experiment = await fetchUoExperiment(experimentMessage.experimentPk);
  const exists = await scicatApi.checkProposalExists(experiment.experimentId);

  if (exists) {
    logger.logInfo('Experiment already exists, updating...', {
      proposalId: experiment.experimentId,
    });
    await scicatApi.updateExperiment(experiment);
  } else {
    logger.logInfo('Experiment does not exist yet, creating...', {
      proposalId: experiment.experimentId,
    });
    await scicatApi.createExperiment(experiment);
  }

  await upsertSamplesInScicat(experiment);
};
