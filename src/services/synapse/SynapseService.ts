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

import { produceSynapseUserId } from './produceSynapseUserId';
import { axiosFetch } from '../../config/utils';
import {
  ProposalUser,
  ChatRoom,
  UserId,
  SynapseUser,
} from '../../queue/consumers/scicat/scicatProposal/dto';

interface MemberObject {
  [key: string]: {
    display_name: string;
    [key: string]: string;
  };
}

const serverUrl = process.env.SYNAPSE_SERVER_URL;
const serverName = process.env.SYNAPSE_SERVER_NAME;
const oauthIssuer = process.env.SYNAPSE_OAUTH_ISSUER;
const thirdPartyId = process.env.SYNAPSE_THIRD_PARTY_ID || 'email';
const serviceAccount = {
  userId: process.env.SYNAPSE_SERVICE_USER,
  password: process.env.SYNAPSE_SERVICE_PASSWORD,
};

const ADMIN_API_PREFIX_V2 = '/_synapse/admin/v2';
const ADMIN_API_PREFIX_V1 = '/_synapse/admin/v1';
const CLIENT_API_PREFIX_V1 = '/_matrix/client/api/v1';

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

    this.client = createClient({
      baseUrl: serverUrl,
      fetchFn: axiosFetch,
    });

    // TODO, If consumer service is started after downtime, and there are some pending messages in the queue
    // then it could be that queue handler will delegate handling of messages before connection to supabase is established
    this.client.loginWithPassword(
      serviceAccount.userId,
      serviceAccount.password
    );
  }

  async createRoom(name: string, topic: string, members: ProposalUser[]) {
    const membersList = await Promise.all(
      members.map(async (member) => await produceSynapseUserId(member, this))
    );
    const room = await this.client.http
      .authedRequest(
        Method.Post,
        '/createRoom',
        undefined,
        {
          name: name,
          topic: topic,
          visibility: Visibility.Private,
          invite: membersList,
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

  async sendMessage(roomName: string, message: string) {
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

    const roomId = await this.getRoomIdByName(roomName);

    const members = await this.client
      .getJoinedRoomMembers(roomId)
      .then((members) => members.joined);

    const isUserJoined = (members: MemberObject) => {
      for (const member in members) {
        if (members[member].display_name.includes(`${serviceAccount.userId}`))
          return true;
      }

      return false;
    };

    if (!isUserJoined(members)) {
      await this.joinRoom(roomId);
    }

    await this.client
      .sendEvent(roomId, EventType.RoomMessage, messageContent, '')
      .then(() => {
        logger.logInfo('Success sending message to chatroom ', {
          roomId: roomId,
          message: message,
        });
      })
      .catch((reason) => {
        logger.logError('Failed sending message to chatroom', {
          roomId: roomId,
          message: message,
          reason,
        });
        throw reason;
      });
  }

  async invite(roomId: string, members: ProposalUser[]) {
    const invitedUsers: { userId: string; invited: boolean }[] = [];
    for (const member of members) {
      const userId = await produceSynapseUserId(member, this);
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
          if (!reason.message.includes('already in the room')) {
            logger.logError('Failed to invite user', {
              message: reason?.message,
              member,
            });
          }
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
  async getUserByOidcSub(oidcSub: string) {
    const result = await this.client.http
      .authedRequest<UserId>(
        Method.Get,
        `/auth_providers/${oauthIssuer}/users/${oidcSub}`,
        {},
        undefined,
        {
          prefix: ADMIN_API_PREFIX_V1,
        }
      )
      .catch((reason) => {
        if (!reason.message.includes('User not found')) {
          logger.logError('Not able to find user by oidc_sub', {
            message: reason.message,
          });
        }

        return undefined;
      });

    return result;
  }

  async getUserByEmail(email: string) {
    const result = await this.client.http
      .authedRequest<UserId>(
        Method.Get,
        `/threepid/${thirdPartyId}/users/${email}`,
        {},
        undefined,
        {
          prefix: ADMIN_API_PREFIX_V1,
        }
      )
      .catch((reason) => {
        if (!reason.message.includes('User not found')) {
          logger.logError('Not able to find user by Email', {
            message: reason.message,
          });
        }

        return undefined;
      });

    return result;
  }

  async getUserInfo(userId: string) {
    const result = await this.client.http
      .authedRequest<SynapseUser>(
        Method.Get,
        `/users/${userId}`,
        {},
        undefined,
        {
          prefix: ADMIN_API_PREFIX_V2,
        }
      )
      .catch((reason) => {
        logger.logError('Not able to get user information', {
          message: reason.message,
        });

        return undefined;
      });

    return result;
  }

  async getRoomIdByName(name: string) {
    // TODO: if more than one identical name rooms exist,
    // we need to include a filter to find the room we want,
    // for now we just choose the first room we find.
    const rooms = await this.getRoomByName(name);
    const roomId = rooms[0].room_id;

    return roomId;
  }

  async joinRoom(roomName: string) {
    const roomId = await this.getRoomIdByName(roomName);
    try {
      await this.client.joinRoom(roomId);
      logger.logInfo('Joined room', { roomId });
    } catch (reason) {
      logger.logError('Failed to join room', { reason, roomId });
      throw reason;
    }
  }

  async updateUser(member: ProposalUser): Promise<User> {
    const userid = await produceSynapseUserId(member, this);
    const result = await this.client.http
      .authedRequest(
        Method.Put,
        `/users/${userid}`,
        undefined,
        {
          name: `${member.firstName} ${member.lastName}`,
          external_ids: [
            {
              auth_provider: oauthIssuer,
              external_id: member.oidcSub,
            },
          ],
          threepids: [
            {
              medium: thirdPartyId,
              address: member.email,
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

  async getUserId(member: ProposalUser) {
    const user =
      (await this.getUserByOidcSub(member.oidcSub)) ||
      (await this.getUserByEmail(member.email));

    if (!user) {
      logger.logInfo('User not exists: ', { member });
    }

    return user;
  }

  async createUser(member: ProposalUser, password: string) {
    const userid = await produceSynapseUserId(member, this);
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
              auth_provider: oauthIssuer,
              external_id: member.oidcSub,
            },
          ],
          threepids: [
            {
              medium: thirdPartyId,
              address: member.email,
            },
          ],
        },
        { prefix: ADMIN_API_PREFIX_V2 }
      )
      .catch((reason) => {
        logger.logError('Failed to create user', {
          message: reason.message,
          member,
        });
        throw reason;
      });

    return result as User;
  }
}
