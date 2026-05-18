import { logger } from '@user-office-software/duo-logger';

import {
  ExperimentMessageData,
  InstrumentDto,
  ProposalMessageData,
} from '../../../../../models/ProposalMessage';
import { UOInstrument, UOProposal } from '../../userOfficeApi/dto/proposal.dto';
import { fetchUoExperiment, fetchUoProposal } from '../../userOfficeApi/uoApi';
import {
  getCreateProposalDto,
  getUpdateProposalDto,
} from '../utils.ts/proposalTransformer';

const sciCatBaseUrl = process.env.SCICAT_BASE_URL;
const sciCatLoginEndpoint = process.env.SCICAT_LOGIN_ENDPOINT || '/Users/login';
const sciCatUsername = process.env.SCICAT_USERNAME;
const sciCatPassword = process.env.SCICAT_PASSWORD;

async function request<TResponse>(
  url: string,
  config: RequestInit
): Promise<TResponse> {
  // NOTE: Node v18 comes with fetch API by default
  const response = await fetch(url, config);

  if (!response.ok) {
    return response.text().then((errorDetail) => {
      throw new Error(errorDetail);
    });
  }

  return (await response.json()) as TResponse;
}

const getSciCatAccessToken = async () => {
  const loginCredentials = {
    username: sciCatUsername,
    password: sciCatPassword,
  };

  // NOTE: We login every time when there is new message to get the access_token
  const { access_token: sciCatAccessToken } = await request<{
    access_token: string;
  }>(`${sciCatBaseUrl}${sciCatLoginEndpoint}`, {
    method: 'POST',
    body: JSON.stringify(loginCredentials),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!sciCatAccessToken) {
    throw new Error('No access token found');
  }

  return sciCatAccessToken;
};

const createProposal = async (
  UOProposal: UOProposal,
  sciCatAccessToken: string
) => {
  const url = `${sciCatBaseUrl}/Proposals`;

  const scicatInstrumentIds = await getInstrumentIds(UOProposal.instruments);
  const createProposalDto = getCreateProposalDto(
    UOProposal,
    scicatInstrumentIds
  );

  logger.logInfo('POST', { url });
  logger.logInfo('Proposal data', { proposalData: createProposalDto });

  // RabbitMQ message only provides shortCodes (instrument names).
  // To persist proposals with proper references, we resolve those shortCodes to
  // actual Instrument IDs from SciCat and store the instrumentIds in the record.

  const createProposalResponse = await request<string>(url, {
    method: 'POST',
    body: JSON.stringify(createProposalDto),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sciCatAccessToken}`,
    },
  });

  logger.logInfo('createProposalResponse', { createProposalResponse });

  logger.logInfo('Proposal was created in scicat', {
    proposalId: createProposalDto.proposalId,
  });
};

const updateProposal = async (
  UOProposal: UOProposal,
  sciCatAccessToken: string
) => {
  const url = `${sciCatBaseUrl}/Proposals/${UOProposal.proposalId}`;

  // RabbitMQ message only provides shortCodes (instrument names).
  // To persist proposals with proper references, we resolve those shortCodes to
  // actual Instrument IDs from SciCat and store the instrumentIds in the record.
  const scicatInstrumentIds = await getInstrumentIds(UOProposal.instruments);

  const updateProposalDto = getUpdateProposalDto(
    UOProposal,
    scicatInstrumentIds
  );

  const updateProposalResponse = await request(url, {
    method: 'PATCH',
    body: JSON.stringify(updateProposalDto),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sciCatAccessToken}`,
    },
  });

  logger.logInfo('Patch', { url });
  logger.logInfo('Proposal data', { proposalData: updateProposalDto });
  logger.logInfo('updateProposalResponse', { updateProposalResponse });

  logger.logInfo('Proposal was updated in scicat', {
    proposalId: UOProposal.proposalId,
  });
};

const checkProposalExists = async (
  proposalId: string,
  sciCatAccessToken: string
) => {
  const url = `${sciCatBaseUrl}/Proposals/${proposalId}`;
  const response = await request<string>(url, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sciCatAccessToken}`,
    },
  }).catch((error) => {
    try {
      const parsedError = JSON.parse(error.message);
      if (parsedError.statusCode === 404) {
        return false;
      }
    } catch (reason) {
      logger.logError('Error parsing error message', {
        error,
        reason,
      });
    }
    throw error;
  });

  if (response) {
    return true;
  } else {
    return false;
  }
};

const getInstrumentIds = async (instruments: UOInstrument[]) => {
  const sciCatAccessToken = await getSciCatAccessToken();
  const instrumentNames = instruments.map((inst) => inst.shortCode);

  const instrumentIds = [];

  for (const name of instrumentNames) {
    const instrumentNameLowerCase = name.toLowerCase();

    const filterString = JSON.stringify({
      where: { name: { ilike: instrumentNameLowerCase } },
    });

    const url = `${sciCatBaseUrl}/Instruments?filter=${encodeURIComponent(filterString)}`;

    try {
      const res = await request<InstrumentDto[]>(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sciCatAccessToken}`,
        },
      });
      if (res[0].pid) {
        instrumentIds.push(res[0].pid);
      }
    } catch (error) {
      logger.logError(`Error fetching instrument ID from scicat for ${name}`, {
        error,
      });
    }
  }

  return instrumentIds;
};

const upsertProposalInScicat = async (proposalMessage: ProposalMessageData) => {
  const sciCatAccessToken = await getSciCatAccessToken();

  const proposal = await fetchUoProposal(proposalMessage.proposalPk);

  const proposalExists = await checkProposalExists(
    proposal.proposalId,
    sciCatAccessToken
  );

  if (proposalExists) {
    logger.logInfo('Proposal already exists, updating...', {
      proposalId: proposal.proposalId,
    });
    updateProposal(proposal, sciCatAccessToken);
  } else {
    logger.logInfo('Proposal does not exist yet, creating...', {
      proposalId: proposal.proposalId,
    });

    createProposal(proposal, sciCatAccessToken);
  }
};

const upsertExperimentInScicat = async (
  experimentMessage: ExperimentMessageData
) => {
  const sciCatAccessToken = await getSciCatAccessToken();

  const experiment: any = await fetchUoExperiment(
    experimentMessage.experimentPk
  );

  const experimentExists = await checkProposalExists(
    experiment.proposalId,
    sciCatAccessToken
  );

  if (experimentExists) {
    logger.logInfo('Experiment already exists, updating...', {
      experimentId: experiment.proposalId,
    });

    updateProposal(experiment, sciCatAccessToken);
  } else {
    logger.logInfo('Experiment does not exist yet, creating...', {
      experimentId: experiment.proposalId,
    });

    createProposal(experiment, sciCatAccessToken);
  }
};

export { upsertProposalInScicat, upsertExperimentInScicat };
