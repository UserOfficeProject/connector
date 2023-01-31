import { logger } from '@user-office-software/duo-logger';
import {
  MatrixClient,
  Method,
  User,
  Visibility,
  createClient,
  EventType,
  MsgType,
} from 'matrix-js-sdk';

import {
  ChatRoom,
  ProposalUser,
} from '../queue/consumers/scicat/scicatProposal/dto';

const serverUrl = process.env.SYNAPSE_SERVER_URL;
const serverName = process.env.SYNAPSE_SERVER_NAME;
const oauthIssuer = process.env.SYNAPSE_OAUTH_ISSUER;
const serviceAccount = {
  userId: process.env.SYNAPSE_SERVICE_USER,
  password: process.env.SYNAPSE_SERVICE_PASSWORD,
};

const ADMIN_API_PREFIX_V2 = '/_synapse/admin/v2';
const ADMIN_API_PREFIX_V1 = '/_synapse/admin/v1';
const CLIENT_API_PREFIX_V1 = '/_matrix/client/api/v1';

/**
 * Produces a synapse user id from a member
 * @param member Member to produce synapse user id from
 * @param skipPrePostfix If true, the @ and :serverName will not be added
 * @returns Synapse user id
 */
function produceSynapseUserId(
  member: ProposalUser,
  skipPrePostfix: boolean = false
): string {
  const fullName =
    member.firstName.toLocaleLowerCase() + member.lastName.toLocaleLowerCase();
  const normalizedFullName = fullName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (skipPrePostfix) {
    return normalizedFullName;
  }

  return `@${normalizedFullName}:${serverName}`;
}

export class SynapseService {
  private client: MatrixClient;
  constructor() {
    if (!serverUrl) throw new Error('SYNAPSE_SERVER_NAME is not set');
    if (!serverName) throw new Error('SYNAPSE_SERVER_NAME is not set');
    if (!oauthIssuer) throw new Error('SYNAPSE_OAUTH_ISSUER is not set');
    if (!serviceAccount.userId)
      throw new Error('SYNAPSE_SERVICE_USER is not set');
    if (!serviceAccount.password)
      throw new Error('SYNAPSE_SERVICE_PASSWORD is not set');

    this.client = createClient({ baseUrl: serverUrl });

    // TODO, If consumer service is started after downtime, and there are some pending messages in the queue
    // then it could be that queue handler will delegate handling of messages before connection to supabase is established
    this.client.loginWithPassword(
      serviceAccount.userId,
      serviceAccount.password
    );
  }

  async createRoom(name: string, topic: string, members: ProposalUser[]) {
    const room = await this.client.http
      .authedRequest(
        Method.Post,
        '/createRoom',
        undefined,
        {
          name: name,
          topic: topic,
          visibility: Visibility.Private,
          invite: members.map((member) => produceSynapseUserId(member)),
        },
        { prefix: CLIENT_API_PREFIX_V1 }
      )
      .catch((reason) => {
        logger.logError('Failed to create room', {
          reason,
          name,
          topic,
          members,
        });
        throw reason;
      });

    return room as ChatRoom;
  }

  async joinRoom(roomId: string) {
    await this.client.joinRoom(`${roomId}:${serverName}`).then(() => {
      logger.logInfo('Joined room', { roomId });
    });
  }

  async sendMessage(roomId: string, message: string) {
    const messageContent = {
      body: message,
      msgtype: MsgType.Text,
    };
    /**
     * Send messages to sciChat
     * @params roomId: room id
     * @params eventType: room type
     * @params content: messages to be sent in JSON object
     * @params transactionId: can be empty. It is used to track and verify the status of transactions on the Matrix network
     */
    await this.client
      .sendEvent(
        `${roomId}:${serverName}`,
        EventType.RoomMessage,
        messageContent,
        ''
      )
      .then(() => {
        logger.logInfo('Send message success', {
          roomId: roomId,
          message: message,
        });
      })
      .catch((reason) => {
        logger.logError('Failed to send message', {
          roomId: roomId,
          message: message,
          reason,
        });
      });
  }

  async invite(roomId: string, members: ProposalUser[]) {
    const invitedUsers: { userId: string; invited: boolean }[] = [];
    for (const member of members) {
      const userId = produceSynapseUserId(member);
      await this.client.http
        .authedRequest(
          Method.Post,
          `/join/${roomId}`,
          undefined,
          { user_id: userId },
          { prefix: ADMIN_API_PREFIX_V1 }
        )
        .then(() => {
          logger.logInfo('Invited user to room', { member, roomId });
          invitedUsers.push({ userId, invited: true });
        })
        .catch((reason) => {
          logger.logError('Failed to invite user', { reason, member });
          invitedUsers.push({ userId, invited: false });
          // don't throw, we want to invite all members
        });
    }

    return invitedUsers;
  }

  async getRoomByName(name: string) {
    const result = await this.client.http
      .authedRequest(Method.Get, '/rooms', { search_term: name }, undefined, {
        prefix: ADMIN_API_PREFIX_V1,
      })
      .catch((reason) => {
        logger.logError('Failed to get room by name', { reason, name });
        throw reason;
      });

    const response = result as { rooms: ChatRoom[] };

    return response.rooms;
  }

  async updateUser(member: ProposalUser): Promise<User> {
    const userid = produceSynapseUserId(member);
    const result = await this.client.http
      .authedRequest(
        Method.Put,
        `/users/${userid}`,
        undefined,
        {
          displayname: `${member.firstName} ${member.lastName}`,
          name: `${member.firstName} ${member.lastName}`,
          external_ids: [
            {
              auth_provider: 'oidc-keycloak', //member.oauthIssuer,
              external_id: member.oidcSub,
            },
          ],
        },
        { prefix: ADMIN_API_PREFIX_V2 }
      )
      .catch((reason) => {
        logger.logError('Failed to update user', { reason, member });
        throw reason;
      });

    return result as User;
  }

  async userExists(member: ProposalUser) {
    const synapseUserId = produceSynapseUserId(member, true);

    return this.client
      .isUsernameAvailable(synapseUserId)
      .then((response) => {
        return !response;
      })
      .catch((reason) => {
        logger.logError('Failed to check if user exists', { reason, member });
        throw reason;
      }); // If the user exist, the request will throw
  }

  async createUser(member: ProposalUser, password: string) {
    const userid = produceSynapseUserId(member);
    const result = await this.client.http
      .authedRequest(
        Method.Put,
        `/users/${userid}`,
        undefined,
        {
          displayName: `${member.firstName} ${member.lastName}`,
          password: password,
          external_ids: [
            {
              auth_provider: 'oidc-keycloak', //member.oauthIssuer,
              external_id: member.oidcSub,
            },
          ],
        },
        { prefix: ADMIN_API_PREFIX_V2 }
      )
      .catch((reason) => {
        logger.logError('Failed to create user', { reason, member });
        throw reason;
      });

    return result as User;
  }
}
