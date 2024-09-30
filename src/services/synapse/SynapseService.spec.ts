jest.mock('@user-office-software/duo-logger');
jest.mock('matrix-js-sdk', () => ({
  ...jest.requireActual('matrix-js-sdk'),
  createClient: jest.fn(),
}));
jest.mock('./produceSynapseUserId', () => ({
  produceSynapseUserId: jest.fn(),
}));

import { logger } from '@user-office-software/duo-logger';
import { AxiosError } from 'axios';
import { createClient } from 'matrix-js-sdk';

import { produceSynapseUserId } from './produceSynapseUserId';
import { SynapseService } from './SynapseService';

describe('SynapseService', () => {
  let synapseService: SynapseService;
  let mockLoggerLogError: jest.SpyInstance;
  let mockLoggerLogInfo: jest.SpyInstance;

  const serviceAccountSynapseId = `@${process.env.SYNAPSE_SERVICE_USER}:${process.env.SYNAPSE_SERVER_NAME}`;
  const roomId = '!randomRoom:ess';
  const member = {
    id: 1111,
    email: 'john.doe@example.com',
    firstName: 'John',
    lastName: 'Doe',
    oidcSub: 'john.doe',
    oauthIssuer: 'oidc-ping',
  };
  const joinedRoomMembers = {
    joined: {
      ['user1']: { display_name: 'User1' },
      ['john.doe']: { display_name: 'John Doe' },
      [serviceAccountSynapseId]: { display_name: 'ServiceAccount' },
    },
  };
  const synapseUser = {
    name: '@user:example.com',
    displayname: 'User',
    threepids: [],
    avatar_url: null,
    is_guest: 0,
    admin: 0,
    deactivated: true,
    erased: false,
    shadow_banned: 0,
    creation_ts: 1560432506,
    appservice_id: null,
    consent_server_notice_sent: null,
    consent_version: null,
    consent_ts: null,
    external_ids: [],
    user_type: null,
    locked: false,
  };
  const mockCreateClient = {
    loginWithPassword: jest.fn(),
    http: {
      authedRequest: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.resetAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockCreateClient);
    mockLoggerLogError = jest.spyOn(logger, 'logError');
    mockLoggerLogInfo = jest.spyOn(logger, 'logInfo');
    process.env.SYNAPSE_SERVICE_USER = 'serviceUser';
    process.env.SYNAPSE_SERVER_NAME = 'matrix.org';
    synapseService = new SynapseService();
  });

  describe('invite', () => {
    const validReason = `@${member.oidcSub}:ess already in the room`;
    const InvalidReason = 'invalid reason';
    const memberToBeRemoved = {
      id: 1112,
      email: 'user1@example.com',
      firstName: 'user1',
      lastName: 'test',
      oidcSub: 'user1',
      oauthIssuer: 'oidc-ping',
    };

    it("should not log any errors when the reason message includes 'already in the room", async () => {
      const joinedRoomMembersSet = new Set('');
      jest
        .spyOn(synapseService, 'getRoomMembers')
        .mockResolvedValueOnce(joinedRoomMembersSet);

      (produceSynapseUserId as jest.Mock).mockResolvedValueOnce(member.oidcSub);

      mockCreateClient.http.authedRequest.mockRejectedValueOnce(
        new AxiosError(validReason)
      );

      const result = await synapseService.invite(roomId, [member]);

      expect(mockLoggerLogError).not.toHaveBeenCalledWith(
        'Failed to invite user',
        {
          message: validReason,
          member: member,
        }
      );
      expect(result[0]).toEqual({ invited: false, userId: member.oidcSub });
    });
    it("should log errors when the reason message does not include 'already in the room'", async () => {
      const joinedRoomMembersSet = new Set('');
      jest
        .spyOn(synapseService, 'getRoomMembers')
        .mockResolvedValueOnce(joinedRoomMembersSet);

      (produceSynapseUserId as jest.Mock).mockResolvedValueOnce(member.oidcSub);

      mockCreateClient.http.authedRequest.mockRejectedValueOnce(
        new AxiosError(InvalidReason)
      );

      const result = await synapseService.invite(roomId, [member]);

      expect(mockLoggerLogError).toHaveBeenCalledWith('Failed to invite user', {
        message: InvalidReason,
        member: member,
      });
      expect(result[0]).toEqual({ invited: false, userId: member.oidcSub });
    });

    it('should remove the user from the chatroom if the updated proposal does not include the previous member in the room', async () => {
      const joinedRoomMembersSet = new Set(
        Object.keys(joinedRoomMembers.joined)
      );

      jest
        .spyOn(synapseService, 'getRoomMembers')
        .mockResolvedValueOnce(joinedRoomMembersSet);

      const removeUserFromRoomSpy = jest
        .spyOn(synapseService, 'removeUserFromRoom')
        .mockResolvedValueOnce();

      (produceSynapseUserId as jest.Mock)
        .mockResolvedValueOnce(member.oidcSub)
        .mockResolvedValueOnce(memberToBeRemoved.oidcSub);

      mockCreateClient.http.authedRequest
        .mockResolvedValueOnce('/rooms/${roomId}/joined_members Call')
        .mockResolvedValueOnce('/join/${roomId} Call')
        .mockResolvedValueOnce('/rooms/${roomId}/kick Call');

      const result = await synapseService.invite(roomId, [member]);

      expect(removeUserFromRoomSpy).toHaveBeenCalledWith(
        roomId,
        memberToBeRemoved.oidcSub
      );
      expect(result).toEqual([{ userId: member.oidcSub, invited: true }]);
      expect(result).not.toContainEqual({
        userId: memberToBeRemoved.oidcSub,
        invited: true,
      });
    });
  });

  describe('getUserByOidcSub', () => {
    const validReason = 'User not found';
    const InvalidReason = 'invalid reason';

    it("should not log any errors when the reason message includes 'User not found'", async () => {
      mockCreateClient.http.authedRequest.mockRejectedValueOnce(
        new AxiosError(validReason)
      );

      const result = await synapseService.getUserByOidcSub(member.oidcSub);

      expect(mockLoggerLogError).not.toHaveBeenCalledWith(
        'Not able to find user by oidc_sub',
        {
          message: validReason,
        }
      );

      expect(result).toEqual(undefined);
    });

    it("should log errors when the reason message does not include 'User not found'", async () => {
      mockCreateClient.http.authedRequest.mockRejectedValueOnce(
        new AxiosError(InvalidReason)
      );

      const result = await synapseService.getUserByOidcSub(member.oidcSub);

      expect(mockLoggerLogError).toHaveBeenCalledWith(
        'Not able to find user by oidc_sub',
        {
          message: InvalidReason,
        }
      );

      expect(result).toEqual(undefined);
    });
  });

  describe('getUserByEmail', () => {
    const validReason = 'User not found';
    const InvalidReason = 'invalid reason';

    it("should not log any errors when the reason message includes 'User not found'", async () => {
      mockCreateClient.http.authedRequest.mockRejectedValueOnce(
        new AxiosError(validReason)
      );

      const result = await synapseService.getUserByEmail(member.email);

      expect(mockLoggerLogError).not.toHaveBeenCalledWith(
        'Not able to find user by Email',
        {
          message: validReason,
        }
      );

      expect(result).toEqual(undefined);
    });

    it("should log errors when the reason message does not include 'User not found'", async () => {
      mockCreateClient.http.authedRequest.mockRejectedValueOnce(
        new AxiosError(InvalidReason)
      );

      const result = await synapseService.getUserByEmail(member.email);

      expect(mockLoggerLogError).toHaveBeenCalledWith(
        'Not able to find user by Email',
        {
          message: InvalidReason,
        }
      );

      expect(result).toEqual(undefined);
    });
  });

  describe('getUserInfo', () => {
    const unknownError = 'unknown Error';

    it('should get detailed user information', async () => {
      mockCreateClient.http.authedRequest.mockResolvedValueOnce(synapseUser);

      const result = await synapseService.getUserInfo(synapseUser.name);

      expect(result).toEqual(synapseUser);
    });

    it('should log errors if the user information is not reterivable', async () => {
      mockCreateClient.http.authedRequest.mockRejectedValueOnce(
        new AxiosError(unknownError)
      );

      const result = await synapseService.getUserInfo(synapseUser.name);

      expect(mockLoggerLogError).toHaveBeenCalledWith(
        'Not able to get user information',
        {
          message: unknownError,
        }
      );

      expect(result).toEqual(undefined);
    });
  });


  describe('getRoomMembers', () => {
    const unknownError = 'unknown Error';

    it('should get all the members from the room except the service account', async () => {
      mockCreateClient.http.authedRequest.mockResolvedValueOnce(
        joinedRoomMembers
      );
      const result = await synapseService.getRoomMembers(roomId);

      const noServiceAccount = new Set(Object.keys(joinedRoomMembers.joined));
      noServiceAccount.delete(serviceAccountSynapseId);

      expect(result).toEqual(noServiceAccount);
    });

    it('should log errors if the room members are not retrievable', async () => {
      mockCreateClient.http.authedRequest.mockRejectedValueOnce(
        new AxiosError(unknownError)
      );

      await expect(synapseService.getRoomMembers(roomId)).rejects.toThrow(
        unknownError
      );

      expect(mockLoggerLogError).toHaveBeenCalledWith(
        'Failed to get joined room members',
        {
          reason: new AxiosError(unknownError),
          roomId,
        }
      );
    });
  });

  describe('removeUserFromRoom', () => {
    const unknownError = 'unknown Error';
    const userId = 'user1';

    it('should remove a user from the room', async () => {
      mockCreateClient.http.authedRequest.mockResolvedValueOnce({
        roomId,
        userId,
      });

      await synapseService.removeUserFromRoom(roomId, userId);

      expect(mockLoggerLogInfo).toHaveBeenCalledWith('Removed user from room', {
        roomId,
        userId,
      });
    });

    it('should log errors if the user cannot be removed from the room', async () => {
      mockCreateClient.http.authedRequest.mockRejectedValueOnce(
        new AxiosError(unknownError)
      );

      await expect(
        synapseService.removeUserFromRoom(roomId, userId)
      ).rejects.toThrow(unknownError);

      expect(mockLoggerLogError).toHaveBeenCalledWith(
        'Failed to remove user from room',
        {
          message: unknownError,
          roomId,
          userId,
        }
      );
    });
  });
});
