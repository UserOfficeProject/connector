import { logger } from '@user-office-software/duo-logger';

import { ValidProposalMessageData } from '../../../utils/validateProposalMessage';
import { CreateProposalDto, UpdateProposalDto } from '../dto';

const sciCatBaseUrl = process.env.SCICAT_BASE_URL;
const sciCatLoginEndpoint = process.env.SCICAT_LOGIN_ENDPOINT || '/Users/login';
const sciCatUsername = process.env.SCICAT_USERNAME;
const sciCatPassword = process.env.SCICAT_PASSWORD;

async function request<TResponse>(
  url: string,
  config: RequestInit,
  fetchAsPlainText = false
): Promise<TResponse> {
  // NOTE: Node v18 comes with fetch API by default
  const response = await fetch(url, config);

  if (!response.ok) {
    return response.text().then((text) => {
      throw new Error(`An error occurred while sending the request: ${text}`);
    });
  }

  if (fetchAsPlainText) {
    return (await response.text()) as TResponse;
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

const getCreateProposalDto = (proposalMessage: ValidProposalMessageData) => {
  const createProposalDto: CreateProposalDto = {
    proposalId: proposalMessage.shortCode,
    title: proposalMessage.title,
    pi_email: proposalMessage.proposer.email,
    pi_firstname: proposalMessage.proposer.firstName,
    pi_lastname: proposalMessage.proposer.lastName,
    email: proposalMessage.proposer.email,
    firstname: proposalMessage.proposer.firstName,
    lastname: proposalMessage.proposer.lastName,
    abstract: proposalMessage.abstract,
    ownerGroup: proposalMessage.shortCode,
    accessGroups: [],
    startTime: new Date(),
    endTime: new Date(),
    MeasurementPeriodList: [],
  };

  return createProposalDto;
};

const getUpdateProposalDto = (proposalMessage: ValidProposalMessageData) => {
  const updateProposalDto: UpdateProposalDto = {
    title: proposalMessage.title,
    pi_email: proposalMessage.proposer.email,
    pi_firstname: proposalMessage.proposer.firstName,
    pi_lastname: proposalMessage.proposer.lastName,
    email: proposalMessage.proposer.email,
    firstname: proposalMessage.proposer.firstName,
    lastname: proposalMessage.proposer.lastName,
    abstract: proposalMessage.abstract,
    ownerGroup: proposalMessage.shortCode,
    accessGroups: [],
    startTime: new Date(),
    endTime: new Date(),
    MeasurementPeriodList: [],
  };

  return updateProposalDto;
};

const createProposal = async (
  proposalMessage: ValidProposalMessageData,
  sciCatAccessToken: string
) => {
  const url = `${sciCatBaseUrl}/Proposals`;
  const createProposalDto = getCreateProposalDto(proposalMessage);

  logger.logInfo('POST', { url });
  logger.logInfo('Proposal data', { proposalData: createProposalDto });

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
  proposalMessage: ValidProposalMessageData,
  sciCatAccessToken: string
) => {
  const url = `${sciCatBaseUrl}/Proposals/${proposalMessage.shortCode}`;
  const updateProposalDto = getUpdateProposalDto(proposalMessage);

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
    proposalId: proposalMessage.shortCode,
  });
};

const checkProposalExists = async (
  proposalId: string,
  sciCatAccessToken: string
) => {
  // NOTE: Get proposal by id in scicat-backend-next returns 200 always even if proposal does not exist. This is why we check if there is something in the body.
  const url = `${sciCatBaseUrl}/Proposals/${proposalId}`;
  const fetchedProposalDataAsText = await request<string>(
    url,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sciCatAccessToken}`,
      },
    },
    true
  );

  if (fetchedProposalDataAsText) {
    return true;
  } else {
    return false;
  }
};

const upsertProposalInScicat = async (
  proposalMessage: ValidProposalMessageData
) => {
  const sciCatAccessToken = await getSciCatAccessToken();

  const proposalExists = await checkProposalExists(
    proposalMessage.shortCode,
    sciCatAccessToken
  );

  if (proposalExists) {
    logger.logInfo('Proposal already exists, updating...', {
      proposalId: proposalMessage.shortCode,
    });

    updateProposal(proposalMessage, sciCatAccessToken);
  } else {
    logger.logInfo('Proposal does not exist yet, creating...', {
      proposalId: proposalMessage.shortCode,
    });

    createProposal(proposalMessage, sciCatAccessToken);
  }
};

export { upsertProposalInScicat };
