import { logger } from '@user-office-software/duo-logger';

import { Event } from '../../../../models/Event';
import { ProposalMessageData } from '../../../../models/ProposalMessage';
import { collectUsersFromProposalMessage } from '../../utils/collectUsersFromProposalMessage';
import { ESSOneIdentity } from '../utils/ESSOneIdentity';
import { UID_ESet } from '../utils/interfaces/Eset';
import { UID_Person } from '../utils/interfaces/Person';
import { PersonHasESET } from '../utils/interfaces/PersonHasESET';

export async function syncProposalAndMembersToOneIdentityHandler(
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
      const users = collectUsersFromProposalMessage(message);
      await handleConnectionsBetweenProposalAndPersons(
        oneIdentity,
        uidESet,
        users.map((user) => user.oidcSub)
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

async function discoverPersonsWithRetry(
  oneIdentity: ESSOneIdentity,
  centralAccounts: string[]
): Promise<UID_Person[]> {
  const MAX_RETRIES = 3;
  const RETRY_DELAYS_MS = [20000, 40000, 60000]; // Progressive delays: 20s, 40s, 60s

  let attempts = 0;

  const attemptDiscovery = async (): Promise<UID_Person[]> => {
    attempts++;
    const uidPersons = await oneIdentity.getPersons(centralAccounts);

    if (uidPersons.length !== centralAccounts.length) {
      const missingCentralAccounts = centralAccounts.filter(
        (account) => !uidPersons.includes(account)
      );

      if (attempts < MAX_RETRIES) {
        const delayMs = RETRY_DELAYS_MS[attempts - 1];
        logger.logError('discoverOIMPersonsWithRetry: incomplete - retrying', {
          attempt: attempts,
          maxRetries: MAX_RETRIES,
          delayMs,
          missingCentralAccounts,
          foundCount: uidPersons.length,
          expectedCount: centralAccounts.length,
        });

        await new Promise((resolve) => setTimeout(resolve, delayMs));

        return attemptDiscovery();
      } else {
        logger.logError(
          'discoverOIMPersonsWithRetry: failed after max retries',
          {
            attempt: attempts,
            maxRetries: MAX_RETRIES,
            missingCentralAccounts,
            foundCount: uidPersons.length,
            expectedCount: centralAccounts.length,
          }
        );

        return uidPersons;
      }
    }

    logger.logInfo('discoverOIMPersonsWithRetry: success', {
      attempt: attempts,
      foundCount: uidPersons.length,
    });

    return uidPersons;
  };

  return attemptDiscovery();
}

async function handleConnectionsBetweenProposalAndPersons(
  oneIdentity: ESSOneIdentity,
  uidESet: UID_ESet,
  centralAccounts: string[]
) {
  logger.logInfo('Users to be connected to proposal', {
    centralAccounts,
  });

  // Get all users from One Identity
  const uidPersons = await discoverPersonsWithRetry(
    oneIdentity,
    centralAccounts
  );

  logger.logInfo('Found persons in One Identity', { uidPersons });

  // Get all connections between UID_ESet and UID_Person
  const connections = await oneIdentity.getProposalPersonConnections(uidESet);

  await removeOldConnections(oneIdentity, connections, uidPersons);
  await addNewConnections(oneIdentity, uidESet, connections, uidPersons);

  logger.logInfo('Connections updated', { uidESet, uidPersons });
}

async function addNewConnections(
  oneIdentity: ESSOneIdentity,
  uidESet: UID_ESet,
  connections: PersonHasESET[],
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
  connections: PersonHasESET[],
  uidPersons: UID_Person[]
): Promise<void> {
  // Collect connections that are not in the list of current persons (OIM)
  const potentiallyRemoveableConnections = connections.filter(
    (connection) => !uidPersons.includes(connection.UID_Person)
  );

  const removalChecks = await Promise.all(
    potentiallyRemoveableConnections.map(async (connectionToRemove) => {
      const hasAccess = await oneIdentity.hasPersonSiteAccessToProposal(
        connectionToRemove.UID_Person,
        connectionToRemove.UID_ESet
      );

      return {
        connection: connectionToRemove,
        shouldRemove: !hasAccess, // Remove if the person does NOT have site access
      };
    })
  );

  // Filter out connections that should not be removed
  const connectionsToRemove = removalChecks
    .filter((check) => check.shouldRemove)
    .map((check) => check.connection);

  await Promise.all(
    connectionsToRemove.map((connection) =>
      oneIdentity.removeConnectionBetweenPersonAndProposal(
        connection.UID_ESet,
        connection.UID_Person
      )
    )
  );
}
