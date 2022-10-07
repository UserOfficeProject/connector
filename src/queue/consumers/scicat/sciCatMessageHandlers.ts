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

const handleProposalStatusChange: ConsumerCallback = async (type, message) => {
  try {
    const proposalMessage = message as ProposalMessageData;
    if (!proposalMessage.newStatus || !proposalTriggeringStatuses) {
      return;
    }

    // NOTE: If new status is not one of the triggering statuses
    if (proposalTriggeringStatuses.indexOf(proposalMessage.newStatus) === -1) {
      return;
    }

    if (!proposalMessage.proposer) {
      logger.logInfo('Message is missing data about the proposer', {
        proposalMessage,
      });

      return;
    }

    const proposalData: CreateProposalDto = {
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
      createdBy: 'proposalIngestor',
      updatedBy: 'proposalIngestor',
      startTime: new Date(),
      endTime: new Date(),
      MeasurementPeriodList: [],
    };

    const loginCredentials = {
      username: sciCatUsername,
      password: sciCatPassword,
    };

    // NOTE: We login every time when there is new message to get the access_token
    const loginResponse = await fetch(
      `${sciCatBaseUrl}${sciCatLoginEndpoint}`,
      {
        method: 'POST',
        body: JSON.stringify(loginCredentials),
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!loginResponse.ok) {
      throw new Error(loginResponse.statusText);
    }

    const { access_token: sciCatAccessToken } = await loginResponse.json();

    if (!sciCatAccessToken) {
      throw new Error('No access token found');
    }

    // NOTE: Get proposal in scicat
    const getProposalResponse = await fetch(
      `${sciCatBaseUrl}/Proposals/${proposalData.proposalId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sciCatAccessToken}`,
        },
      }
    );

    if (!getProposalResponse.ok) {
      throw new Error(getProposalResponse.statusText);
    }

    // NOTE: Get proposal by id in scicat-backend-next returns 200 always even if proposal does not exist. This is why we check if there is something in the body.
    const fetchedProposalDataAsText = await getProposalResponse.text();

    if (getProposalResponse.ok && fetchedProposalDataAsText) {
      logger.logInfo('Proposal already exists', {
        proposalId: proposalData.proposalId,
      });

      // NOTE: Create proposal in scicat
      const createProposalResponse = await fetch(
        `${sciCatBaseUrl}/Proposals/${proposalData.proposalId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(proposalData),
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sciCatAccessToken}`,
          },
        }
      );

      if (!createProposalResponse.ok) {
        throw new Error(createProposalResponse.statusText);
      }

      logger.logInfo('Proposal was updated in scicat', {
        proposalId: proposalData.proposalId,
      });
    } else {
      // NOTE: Create proposal in scicat
      const createProposalResponse = await fetch(`${sciCatBaseUrl}/Proposals`, {
        method: 'POST',
        body: JSON.stringify(proposalData),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sciCatAccessToken}`,
        },
      });

      if (!createProposalResponse.ok) {
        throw new Error(createProposalResponse.statusText);
      }

      logger.logInfo('Proposal was created in scicat', {
        proposalId: proposalData.proposalId,
      });
    }

    return;
  } catch (error) {
    logger.logException('Error while creating proposal: ', error);

    throw error;
  }
};

export { handleProposalStatusChange };
