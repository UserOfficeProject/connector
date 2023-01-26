import { logger } from '@user-office-software/duo-logger';
import { ConsumerCallback } from '@user-office-software/duo-message-broker';
import fetch from 'node-fetch';

import { ProposalMessageData } from '../../../models/ProposalMessage';
import { CreateProposalDto } from '../../../models/SciCatProposalDto';

const proposalTriggeringStatuses =
  process.env.SCICAT_PROPOSAL_TRIGGERING_STATUSES?.split(', ');

const sciCatBaseUrl = process.env.SCICAT_BASE_URL;
const sciCatLoginEndpoint = process.env.SCICAT_LOGIN_ENDPOINT || '/Users/login';
const sciCatUsername = process.env.SCICAT_USERNAME;
const sciCatPassword = process.env.SCICAT_PASSWORD;

type ValidProposalMessageData = Required<
  Pick<ProposalMessageData, 'title' | 'proposer' | 'abstract' | 'shortCode'>
>;

const getSciCatAccessToken = async () => {
  const loginCredentials = {
    username: sciCatUsername,
    password: sciCatPassword,
  };

  // NOTE: We login every time when there is new message to get the access_token
  const loginResponse = await fetch(`${sciCatBaseUrl}${sciCatLoginEndpoint}`, {
    method: 'POST',
    body: JSON.stringify(loginCredentials),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!loginResponse.ok) {
    throw new Error(loginResponse.statusText);
  }

  const { access_token: sciCatAccessToken } = await loginResponse.json();

  if (!sciCatAccessToken) {
    throw new Error('No access token found');
  }

  return sciCatAccessToken;
};

const containsTriggeringStatus = (proposalMessage: ProposalMessageData) => {
  if (!proposalMessage.newStatus || !proposalTriggeringStatuses) {
    return false;
  }

  // NOTE: If new status is not one of the triggering statuses
  if (proposalTriggeringStatuses.indexOf(proposalMessage.newStatus) === -1) {
    return false;
  }

  return true;
};

const validateProposalMessage = (
  proposalMessage: ProposalMessageData
): ValidProposalMessageData => {
  if (!proposalMessage.title) {
    throw new Error('Proposal title is missing');
  }

  if (!proposalMessage.proposer) {
    throw new Error('Proposal proposer is missing');
  }

  if (!proposalMessage.proposer.firstName) {
    throw new Error('Proposal proposer first name is missing');
  }

  if (!proposalMessage.proposer.lastName) {
    throw new Error('Proposal proposer last name is missing');
  }

  if (!proposalMessage.proposer.email) {
    throw new Error('Proposal proposer email is missing');
  }

  if (!proposalMessage.abstract) {
    throw new Error('Proposal abstract is missing');
  }

  if (!proposalMessage.shortCode) {
    throw new Error('Proposal short code is missing');
  }

  return proposalMessage as ValidProposalMessageData;
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
    ownerGroup: 'ess',
    accessGroups: [],
    startTime: new Date(),
    endTime: new Date(),
    MeasurementPeriodList: [],
  };

  return createProposalDto;
};

const createProposal = async (
  proposalMessage: ValidProposalMessageData,
  sciCatAccessToken: string
) => {
  const url = `${sciCatBaseUrl}/Proposals`;
  const createProposalDto = getCreateProposalDto(proposalMessage);

  const createProposalResponse = await fetch(url, {
    method: 'POST',
    body: JSON.stringify(createProposalDto),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sciCatAccessToken}`,
    },
  });

  logger.logInfo('POST', { url });
  logger.logInfo('Proposal data', { proposalData: createProposalDto });
  logger.logInfo('createProposalResponse', { createProposalResponse });

  if (!createProposalResponse.ok) {
    throw new Error(createProposalResponse.statusText);
  }

  logger.logInfo('Proposal was created in scicat', {
    proposalId: createProposalDto.proposalId,
  });
};

const updateProposal = async (
  proposalMessage: ValidProposalMessageData,
  sciCatAccessToken: string
) => {
  const url = `${sciCatBaseUrl}/Proposals/${proposalMessage.shortCode}`;
  const updateProposalDto = getCreateProposalDto(proposalMessage);

  const updateProposalResponse = await fetch(url, {
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

  if (!updateProposalResponse.ok) {
    throw new Error(updateProposalResponse.statusText);
  }

  logger.logInfo('Proposal was updated in scicat', {
    proposalId: proposalMessage.shortCode,
  });
};

const checkProposalExists = async (
  proposalId: string,
  sciCatAccessToken: string
) => {
  const url = `${sciCatBaseUrl}/Proposals/${proposalId}`;
  const getProposalResponse = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sciCatAccessToken}`,
    },
  });

  if (!getProposalResponse.ok) {
    throw new Error(getProposalResponse.statusText);
  }

  // NOTE: Get proposal by id in scicat-backend-next returns 200 always even if proposal does not exist. This is why we check if there is something in the body.
  const fetchedProposalDataAsText = await getProposalResponse.text();

  if (getProposalResponse.ok && fetchedProposalDataAsText) {
    return true;
  } else {
    return false;
  }
};

const upsertProposalInNicos: ConsumerCallback = async (type, message) => {
  try {
    if (!containsTriggeringStatus(message as ProposalMessageData)) {
      return;
    }

    const proposalMessage = validateProposalMessage(
      message as ProposalMessageData
    );

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
  } catch (error) {
    logger.logException('Error while upserting proposal: ', error);

    throw error;
  }
};

export { upsertProposalInNicos };
