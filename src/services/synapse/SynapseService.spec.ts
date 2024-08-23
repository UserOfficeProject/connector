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

  const roomId = 'randomId';
  const member = {
    id: 1111,
    email: 'john.doe@example.com',
    firstName: 'John',
    lastName: 'Doe',
    oidcSub: '1234',
    oauthIssuer: 'oidc-ping',
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
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockCreateClient);
    mockLoggerLogError = jest.spyOn(logger, 'logError');
    synapseService = new SynapseService();
  });

  describe('invite', () => {
    const validReason = `@${member.id}:ess already in the room`;
    const InvalidReason = 'invalid reason';

    it("should not log any errors when the reason message includes 'already in the room", async () => {
      (produceSynapseUserId as jest.Mock).mockResolvedValue(member.id);

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
      expect(result[0]).toEqual({ invited: false, userId: member.id });
    });
    it("should log errors when the reason message does not include 'already in the room'", async () => {
      (produceSynapseUserId as jest.Mock).mockResolvedValue(member.id);

      mockCreateClient.http.authedRequest.mockRejectedValueOnce(
        new AxiosError(InvalidReason)
      );
      const result = await synapseService.invite(roomId, [member]);

      expect(mockLoggerLogError).toHaveBeenCalledWith('Failed to invite user', {
        message: InvalidReason,
        member: member,
      });
      expect(result[0]).toEqual({ invited: false, userId: member.id });
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
});
