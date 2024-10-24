import { logger } from '@user-office-software/duo-logger';

import { Event } from '../../../../models/Event';
import { ProposalMessageData } from '../../../../models/ProposalMessage';
import { collectUsersFromProposalMessage } from '../../utils/collectUsersFromProposalMessage';
import {
  ESSOneIdentity,
  PersonHasESETValues,
  UID_ESet,
  UID_Person,
  UserPersonConnection,
} from '../utils/ESSOneIdentity';

export async function oneIdentityIntegrationHandler(
  message: ProposalMessageData,
  type: Event
): Promise<void> {
  // Create a new ESSOneIdentity instance and log in
  const oneIdentity = new ESSOneIdentity();
  await oneIdentity.login();

  logger.logInfo('One Identity successfully logged in', {});

  try {
    const uidESet = await getUIDESetFromOneIdentity(oneIdentity, message, type);

    logger.logInfo('UID_ESet from One Identity', { uidESet });

    if (uidESet) {
      await handleConnectionsBetweenProposalAndPersons(
        oneIdentity,
        uidESet,
        message
      );
    }
  } finally {
    await oneIdentity.logout();
    logger.logInfo('One Identity successfully logged out', {});
  }
}

// Method to get UID_ESet from One Identity, create it if it does not exist
async function getUIDESetFromOneIdentity(
  oneIdentity: ESSOneIdentity,
  message: ProposalMessageData,
  type: Event
): Promise<UID_ESet | undefined> {
  let uidESet: UID_ESet | undefined = await oneIdentity.getProposal(message);

  logger.logInfo('Proposal in One Identity', { uidESet });

  if (type === Event.PROPOSAL_UPDATED && !uidESet) {
    // Proposal does not exist in One Identity
    return;
  }

  if (!uidESet) {
    // Create proposal in One Identity if it does not exist
    uidESet = await oneIdentity.createProposal(message);

    logger.logInfo('UID_ESet created', { uidESet });

    if (!uidESet) {
      throw new Error('Proposal creation failed in ESS One Identity');
    }
  }

  return uidESet;
}

async function handleConnectionsBetweenProposalAndPersons(
  oneIdentity: ESSOneIdentity,
  uidESet: UID_ESet,
  message: ProposalMessageData
) {
  const users = collectUsersFromProposalMessage(message);

  logger.logInfo('Users from proposal', { users });

  // Get all users from One Identity
  const userPersonConnections = await oneIdentity.getPersons(users);
  const uidPersons = getUidPersons(userPersonConnections);

  // Log an error if not all users are found in One Identity to be able to investigate
  if (uidPersons.length !== users.length) {
    logger.logError('Not all users found in One Identity (investigate)', {
      users,
      uidPersons,
    });
  }

  logger.logInfo('Found persons in One Identity', { uidPersons });

  // Get all connections between UID_ESet and UID_Person
  const connections = await oneIdentity.getProposalPersonConnections(uidESet);

  await removeOldConnections(oneIdentity, connections, uidPersons);
  await addNewConnections(oneIdentity, uidESet, connections, uidPersons);

  logger.logInfo('Connections updated', { uidESet, uidPersons });
}

// Method to get UID_Person from UserPersonConnection
function getUidPersons(
  userPersonConnections: UserPersonConnection[]
): UID_Person[] {
  return userPersonConnections
    .filter(
      (connection): connection is { email: string; uidPerson: UID_Person } =>
        connection.uidPerson !== undefined
    )
    .map(({ uidPerson }) => uidPerson);
}

async function addNewConnections(
  oneIdentity: ESSOneIdentity,
  uidESet: UID_ESet,
  connections: PersonHasESETValues[],
  uidPersons: UID_Person[]
): Promise<void> {
  const connectionsToAdd = uidPersons.filter(
    (uidPerson) =>
      !connections.some((connection) => connection.UID_Person === uidPerson)
  );

  await Promise.all(
    connectionsToAdd.map((uidPerson) =>
      oneIdentity.connectPersonToProposal(uidESet, uidPerson)
    )
  );
}

async function removeOldConnections(
  oneIdentity: ESSOneIdentity,
  connections: PersonHasESETValues[],
  uidPersons: UID_Person[]
): Promise<void> {
  const connectionsToRemove = connections.filter(
    (connection) => !uidPersons.includes(connection.UID_Person)
  );

  await Promise.all(
    connectionsToRemove.map((connection) =>
      oneIdentity.removeConnectionBetweenPersonAndProposal(
        connection.UID_ESet,
        connection.UID_Person
      )
    )
  );
}
