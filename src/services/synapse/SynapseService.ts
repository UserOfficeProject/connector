import { logger } from '@user-office-software/duo-logger';

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

/** Minimal subset of MatrixClient used by SynapseService */
interface IMatrixClient {
  loginWithPassword(userId: string, password: string): Promise<unknown>;
  logout(): Promise<unknown>;
  http: {
    authedRequest(
      method: string,
      path: string,
      queryParams?: Record<string, unknown>,
      data?: unknown,
      opts?: { prefix?: string }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ): Promise<any>;
  };
  getJoinedRoomMembers(
    roomId: string
  ): Promise<{ joined: Record<string, { display_name: string }> }>;
  sendEvent(
    roomId: string,
    eventType: string,
    content: unknown,
    txnId?: string
  ): Promise<unknown>;
  joinRoom(roomId: string): Promise<unknown>;
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

interface IMatrixSdk {
  createClient: (opts: { baseUrl: string; fetchFn?: unknown }) => unknown;
  Method: Record<string, string>;
  Visibility: Record<string, string>;
  EventType: Record<string, string>;
  MsgType: Record<string, string>;
}

export class SynapseService {
  private sdkCache: IMatrixSdk | undefined;
  private clientCache: IMatrixClient | undefined;

  constructor() {
    if (!serverUrl) throw new Error('SYNAPSE_SERVER_NAME is not set');
    if (!serverName) throw new Error('SYNAPSE_SERVER_NAME is not set');
    if (!oauthIssuer) throw new Error('SYNAPSE_OAUTH_ISSUER is not set');
    if (!serviceAccount.userId)
      throw new Error('SYNAPSE_SERVICE_USER is not set');
    if (!serviceAccount.password)
      throw new Error('SYNAPSE_SERVICE_PASSWORD is not set');
  }

  private async getMatrix(): Promise<IMatrixSdk> {
    if (!this.sdkCache) {
      this.sdkCache = (await import('matrix-js-sdk')) as unknown as IMatrixSdk;
    }

    return this.sdkCache as IMatrixSdk;
  }

  private async getClient(): Promise<IMatrixClient> {
    if (!this.clientCache) {
      const { createClient } = await this.getMatrix();
      this.clientCache = createClient({
        baseUrl: serverUrl!,
        fetchFn: axiosFetch,
      }) as IMatrixClient;
    }

    return this.clientCache;
  }

  async login(consumerName = 'ChatroomCreationQueueConsumer') {
    if (!serviceAccount.userId)
      throw new Error('SYNAPSE_SERVICE_USER is not set');
    if (!serviceAccount.password)
      throw new Error('SYNAPSE_SERVICE_PASSWORD is not set');

    try {
      const client = await this.getClient();
      await client.loginWithPassword(
        serviceAccount.userId,
        serviceAccount.password
      );
    } catch (error) {
      logger.logError(`Failed to login to Synapse from ${consumerName}`, {
        error,
      });
      throw error;
    }
  }

  async logout() {
    try {
      const client = await this.getClient();
      await client.logout();
    } catch (error) {
      logger.logError('Failed to logout from Synapse', { error });
      throw error;
    }
  }

  async createRoom(name: string, topic: string, members: ProposalUser[]) {
    const membersList = await Promise.all(
      members.map(async (member) => await produceSynapseUserId(member, this))
    );
    const { Method, Visibility } = await this.getMatrix();
    const client = await this.getClient();
    const room = await client.http
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
    const { EventType, MsgType } = await this.getMatrix();
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
    const client = await this.getClient();

    const members = await client
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

    await client
      .sendEvent(roomId, EventType.RoomMessage, messageContent, '')
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
    const usersToBeRemoved = await this.getRoomMembers(roomId);
    const { Method } = await this.getMatrix();
    const client = await this.getClient();

    for (const member of members) {
      const userId = await produceSynapseUserId(member, this);
      await client.http
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
      usersToBeRemoved.delete(userId);
    }

    if (usersToBeRemoved.size > 0) {
      for (const userId of usersToBeRemoved) {
        await this.removeUserFromRoom(roomId, userId);
      }
    }

    return invitedUsers;
  }

  async getRoomByName(name: string) {
    const { Method } = await this.getMatrix();
    const client = await this.getClient();
    const result = await client.http
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
    const { Method } = await this.getMatrix();
    const client = await this.getClient();
    const result = await client.http
      .authedRequest(
        Method.Get,
        `/auth_providers/${oauthIssuer}/users/${oidcSub}`,
        {},
        undefined,
        {
          prefix: ADMIN_API_PREFIX_V1,
        }
      )
      .catch((reason: Error) => {
        if (!reason.message.includes('User not found')) {
          logger.logError('Not able to find user by oidc_sub', {
            message: reason.message,
          });
        }

        return undefined;
      });

    return result as UserId | undefined;
  }

  async getUserByEmail(email: string) {
    const lowerCaseEmail = email.toLowerCase();
    const { Method } = await this.getMatrix();
    const client = await this.getClient();
    const result = await client.http
      .authedRequest(
        Method.Get,
        `/threepid/${thirdPartyId}/users/${lowerCaseEmail}`,
        {},
        undefined,
        {
          prefix: ADMIN_API_PREFIX_V1,
        }
      )
      .catch((reason: Error) => {
        if (!reason.message.includes('User not found')) {
          logger.logError('Not able to find user by Email', {
            message: reason.message,
          });
        }

        return undefined;
      });

    return result as UserId | undefined;
  }

  async getRoomMembers(roomId: string): Promise<Set<string>> {
    // Get all joined room members except service account
    const serviceAccountSynapseId = `@${serviceAccount.userId}:${serverName}`;
    const { Method } = await this.getMatrix();
    const client = await this.getClient();

    const joinedRoomMembers = await client.http
      .authedRequest(
        Method.Get,
        `/rooms/${roomId}/joined_members`,
        {},
        undefined,
        { prefix: CLIENT_API_PREFIX_V1 }
      )
      .then((response: { joined: Record<string, unknown> }) => {
        return new Set(
          Object.keys(response.joined).filter(
            (userId) => userId !== serviceAccountSynapseId
          )
        );
      })
      .catch((reason: Error) => {
        logger.logError('Failed to get joined room members', {
          reason,
          roomId,
        });
        throw reason;
      });

    return joinedRoomMembers;
  }

  async removeUserFromRoom(roomId: string, userId: string) {
    const { Method } = await this.getMatrix();
    const client = await this.getClient();

    return client.http
      .authedRequest(
        Method.Post,
        `/rooms/${roomId}/kick`,
        {},
        { user_id: userId },
        {
          prefix: CLIENT_API_PREFIX_V1,
        }
      )
      .then(() => {
        logger.logInfo('Removed user from room', { roomId, userId });
      })
      .catch((reason) => {
        logger.logError('Failed to remove user from room', {
          message: reason.message,
          roomId,
          userId,
        });
        throw reason;
      });
  }

  async getUserInfo(userId: string) {
    const { Method } = await this.getMatrix();
    const client = await this.getClient();
    const result = await client.http
      .authedRequest(Method.Get, `/users/${userId}`, {}, undefined, {
        prefix: ADMIN_API_PREFIX_V2,
      })
      .catch((reason: Error) => {
        logger.logError('Not able to get user information', {
          message: reason.message,
        });

        return undefined;
      });

    return result as SynapseUser | undefined;
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
    const client = await this.getClient();
    try {
      await client.joinRoom(roomId);
      logger.logInfo('Joined room', { roomId });
    } catch (reason) {
      logger.logError('Failed to join room', { reason, roomId });
      throw reason;
    }
  }

  async updateUser(member: ProposalUser) {
    const userid = await produceSynapseUserId(member, this);
    const { Method } = await this.getMatrix();
    const client = await this.getClient();
    const result = await client.http
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

    return result;
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
    const { Method } = await this.getMatrix();
    const client = await this.getClient();
    const result = await client.http
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

    return result;
  }
}
