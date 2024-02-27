import { Event } from '../../../../models/Event';
import { ProposalMessageData } from '../../../../models/ProposalMessage';
import { ProposalUser } from '../../scicat/scicatProposal/dto';
import { ESSOneIdentity, UID_ESET, UID_Person } from '../utils/ESSOneIdentity';

export async function oneIdentityIntegrationHandler(
  message: ProposalMessageData,
  type: Event
) {
  // Create a new ESSOneIdentity instance and log in
  const oneIdentity = new ESSOneIdentity();
  await oneIdentity.login();

  try {
    // Get the proposal from One Identity
    const esetProposal = await oneIdentity.getProposal(message);

    if (!shouldHandleProposal(type, esetProposal)) {
      await oneIdentity.logout();

      return;
    }

    // Collect all users from the proposal
    const users = collectUsersFromProposal(message);

    // Get or create all users in ESS One Identity
    const uidPersons = await oneIdentity.getOrCreatePersons(users);

    // Handle accepted proposals
    if (type === Event.PROPOSAL_ACCEPTED) {
      await handleAcceptedProposal(oneIdentity, message, uidPersons);
    }
    // Handle updated proposals
    if (type === Event.PROPOSAL_UPDATED) {
      await handleUpdatedProposal(oneIdentity, esetProposal!, uidPersons);
    }
  } catch (error) {
    throw error;
  } finally {
    await oneIdentity.logout();
  }
}

function shouldHandleProposal(type: Event, esetProposal: UID_ESET | undefined) {
  return (
    (type === Event.PROPOSAL_ACCEPTED && !esetProposal) || // Proposal already exists in One Identity
    (type === Event.PROPOSAL_UPDATED && esetProposal) // Proposal does not exist in One Identity
  );
}

async function handleAcceptedProposal(
  oneIdentity: ESSOneIdentity,
  proposalMessage: ProposalMessageData,
  uidPersons: UID_Person[]
) {
  // Create proposal in ESS One Identity
  const uidEset = await oneIdentity.createProposal(proposalMessage);

  if (!uidEset) {
    throw new Error('Proposal creation failed in ESS One Identity');
  }

  // Connect all persons to the proposal
  await Promise.all(
    uidPersons.map((uidPerson) =>
      oneIdentity.connectPersonToProposal(uidEset, uidPerson)
    )
  );
}

async function handleUpdatedProposal(
  oneIdentity: ESSOneIdentity,
  esetProposal: UID_ESET,
  uidPersons: UID_Person[]
) {
  // Get all connections between UID_ESET and UID_Person
  const connections = await oneIdentity.getProposalPersonConnections(
    esetProposal
  );

  // Remove those connections that are not in UID_Person[]
  const connectionsToRemove = connections.filter(
    (connection) => !uidPersons.includes(connection.UID_Person)
  );
  await Promise.all(
    connectionsToRemove.map((connection) =>
      oneIdentity.removeConnectionBetweenPersonAndProposal(
        connection.UID_ESET,
        connection.UID_Person
      )
    )
  );

  // If connection is not found, create a new connection between UID_ESET and UID_Person
  const connectionsToAdd = uidPersons.filter(
    (uidPerson) =>
      !connections.some((connection) => connection.UID_Person === uidPerson)
  );
  await Promise.all(
    connectionsToAdd.map((uidPerson) =>
      oneIdentity.connectPersonToProposal(esetProposal, uidPerson)
    )
  );
}

// Method to collect users from the proposal
function collectUsersFromProposal(
  proposalMessage: ProposalMessageData
): ProposalUser[] {
  return [...proposalMessage.members, proposalMessage.proposer].filter(
    (user): user is ProposalUser => user !== undefined
  );
}
