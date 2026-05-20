import { logger } from '@user-office-software/duo-logger';

import {
  ExperimentMessageData,
  InstrumentDto,
  ProposalMessageData,
} from '../../../../../models/ProposalMessage';
import { UOExperimentDto } from '../../../../../services/userOfficeApi/type/uoExperiment.type';
import {
  UOInstrument,
  UOProposalDto,
} from '../../../../../services/userOfficeApi/type/uoProposal.type';
import {
  fetchUoExperiment,
  fetchUoProposal,
} from '../../../../../services/userOfficeApi/uoApi';
import {
  getCreateScicatExperimentDto,
  getUpdateScicatExperimentDto,
} from '../mappers/uoToScicatExperiment.mapper';
import {
  getCreateScicatProposalDto,
  getUpdateScicatProposalDto,
} from '../mappers/uoToScicatProposal.mapper';

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
  UOProposal: UOProposalDto,
  sciCatAccessToken: string
) => {
  const url = `${sciCatBaseUrl}/Proposals`;

  // RabbitMQ message only provides shortCodes (instrument names).
  // To persist proposals with proper references, we resolve those shortCodes to
  // actual Instrument IDs from SciCat and store the instrumentIds in the record.
  const scicatInstrumentIds = await getInstrumentIds(UOProposal.instruments);
  const createProposalDto = getCreateScicatProposalDto(
    UOProposal,
    scicatInstrumentIds
  );

  const createProposalResponse = await request<string>(url, {
    method: 'POST',
    body: JSON.stringify(createProposalDto),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sciCatAccessToken}`,
    },
  });

  logger.logInfo('Proposal created in SciCat', {
    url,
    proposalId: createProposalDto.proposalId,
    response: createProposalResponse,
  });
};

const updateProposal = async (
  UOProposal: UOProposalDto,
  sciCatAccessToken: string
) => {
  const url = `${sciCatBaseUrl}/Proposals/${UOProposal.proposalId}`;

  // RabbitMQ message only provides shortCodes (instrument names).
  // To persist proposals with proper references, we resolve those shortCodes to
  // actual Instrument IDs from SciCat and store the instrumentIds in the record.
  const scicatInstrumentIds = await getInstrumentIds(UOProposal.instruments);
  const updateProposalDto = getUpdateScicatProposalDto(
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

  logger.logInfo('Proposal updated in SciCat', {
    url,
    proposalId: UOProposal.proposalId,
    response: updateProposalResponse,
  });
};

const createExperiment = async (
  UOExperiment: UOExperimentDto,
  sciCatAccessToken: string
) => {
  const url = `${sciCatBaseUrl}/Proposals`;

  // RabbitMQ message only provides shortCodes (instrument names).
  // To persist proposals with proper references, we resolve those shortCodes to
  // actual Instrument IDs from SciCat and store the instrumentIds in the record.
  const scicatInstrumentIds = await getInstrumentIds(UOExperiment.instrument);
  const createExperimentDto = getCreateScicatExperimentDto(
    UOExperiment,
    scicatInstrumentIds
  );

  const createExperimentResponse = await request<string>(url, {
    method: 'POST',
    body: JSON.stringify(createExperimentDto),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sciCatAccessToken}`,
    },
  });

  // NOTE: UOExperiment.experimentId = proposalId in SciCat for experiments
  logger.logInfo('Experiment created in SciCat', {
    url,
    proposalId: UOExperiment.experimentId,
    response: createExperimentResponse,
  });
};

const updateExperiment = async (
  UOExperiment: UOExperimentDto,
  sciCatAccessToken: string
) => {
  const url = `${sciCatBaseUrl}/Proposals/${UOExperiment.experimentId}`;

  // RabbitMQ message only provides shortCodes (instrument names).
  // To persist proposals with proper references, we resolve those shortCodes to
  // actual Instrument IDs from SciCat and store the instrumentIds in the record.
  const scicatInstrumentIds = await getInstrumentIds(UOExperiment.instrument);
  const updateExperimentDto = getUpdateScicatExperimentDto(
    UOExperiment,
    scicatInstrumentIds
  );

  const updateExperimentResponse = await request(url, {
    method: 'PATCH',
    body: JSON.stringify(updateExperimentDto),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sciCatAccessToken}`,
    },
  });

  // NOTE: UOExperiment.experimentId = proposalId in SciCat for experiments
  logger.logInfo('Experiment updated in SciCat', {
    url,
    proposalId: UOExperiment.experimentId,
    response: updateExperimentResponse,
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

const getInstrumentIds = async (instruments: UOInstrument | UOInstrument[]) => {
  const sciCatAccessToken = await getSciCatAccessToken();
  const instrumentArray = Array.isArray(instruments)
    ? instruments
    : [instruments];
  const instrumentNames = instrumentArray.map((inst) => inst.shortCode);

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

export const upsertProposalInScicat = async (
  proposalMessage: ProposalMessageData
) => {
  const proposal = await fetchUoProposal(proposalMessage.proposalPk);
  const scicatToken = await getSciCatAccessToken();
  const exists = await checkProposalExists(proposal.proposalId, scicatToken);

  if (exists) {
    logger.logInfo('Proposal already exists, updating...', {
      proposalId: proposal.proposalId,
    });
    await updateProposal(proposal, scicatToken);
  } else {
    logger.logInfo('Proposal does not exist yet, creating...', {
      proposalId: proposal.proposalId,
    });
    await createProposal(proposal, scicatToken);
  }
};

export const upsertExperimentInScicat = async (
  experimentMessage: ExperimentMessageData
) => {
  const experiment = await fetchUoExperiment(experimentMessage.experimentPk);
  const scicatToken = await getSciCatAccessToken();
  const exists = await checkProposalExists(
    experiment.experimentId,
    scicatToken
  );

  if (exists) {
    logger.logInfo('Experiment already exists, updating...', {
      proposalId: experiment.experimentId,
    });
    await updateExperiment(experiment, scicatToken);
  } else {
    logger.logInfo('Experiment does not exist yet, creating...', {
      proposalId: experiment.experimentId,
    });
    await createExperiment(experiment, scicatToken);
  }
};
