import { logger } from '@user-office-software/duo-logger';
import Matrix, { Visibility } from 'matrix-js-sdk';

import { ValidProposalMessageData } from './../ScicatProposalQueueConsumer';

const serverUrl =
  process.env.SYNAPSE_SERVER_NAME ?? 'https://server-scichat.swap.ess.eu';
const serverName = process.env.SYNAPSE_SERVER_NAME ?? 'ess';
const serviceAccount = {
  userId: process.env.SYNAPSE_SERVICE_USER ?? '@scichatbot:ess',
  accessToken:
    process.env.SYNAPSE_SERVICE_TOKEN ??
    'syt_c2NpY2hhdGJvdA_zdoVzeGmXOWMCNGTnVfX_2SmyIi',
};

const createChatroom = async (message: ValidProposalMessageData) => {
  logger.logInfo('Creating chatroom', message);

  const proposalAcceptedMessage = message as ValidProposalMessageData;
  const participants = proposalAcceptedMessage.members;
  participants.push(proposalAcceptedMessage.proposer);

  const client = Matrix.createClient({
    baseUrl: serverUrl,
    userId: serviceAccount.userId,
    accessToken: serviceAccount.accessToken,
  });

  const participantIds = participants.map(
    ({ firstName, lastName }) =>
      `@${firstName.toLowerCase() + lastName.toLowerCase()}:${serverName}`
  );

  await client.startClient();

  const room = await client.createRoom({
    visibility: Visibility.Public,
    name: message.shortCode,
    invite: participantIds,
    topic: message.title,
  });

  logger.logInfo('Room created', room);
};

export { createChatroom };
