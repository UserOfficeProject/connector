import { logger } from '@user-office-software/duo-logger';

import { ValidProposalMessageData } from './../ScicatProposalQueueConsumer';
import { ProposalUser } from '../dto';
import { SynapseService } from '../SynapseService';

const defaultPassword = process.env.SYNAPSE_NEW_USER_DEFAULT_PASSWORD || '';

const synapseService = new SynapseService();

function isValidUser(user: ProposalUser) {
  return user?.oidcSub && user?.firstName && user?.lastName && user?.email;
}

function validateUsers(users: ProposalUser[]) {
  const validUsers = [];
  const invalidUsers = [];
  for (const user of users) {
    if (isValidUser(user)) {
      validUsers.push(user);
    } else {
      invalidUsers.push(user);
    }
  }

  return { validUsers, invalidUsers };
}
const createChatroom = async (message: ValidProposalMessageData) => {
  const allUsersOnProposal = [...message.members, message.proposer];

  const { validUsers, invalidUsers } = validateUsers(allUsersOnProposal);
  if (invalidUsers.length > 0) {
    logger.logError(
      'Some users will not be invited to the chatroom due to them being invalid',
      { invalidMembers: invalidUsers }
    );
  }

  for (const user of validUsers) {
    try {
      const userExists = await synapseService.userExists(user);
      if (!userExists) {
        await synapseService.createUser(user, defaultPassword);
      }
      await synapseService.updateUser(user);
    } catch (err: unknown) {
      logger.logError('Error while upserting chatroom user: ', { user, err });
    }
  }

  try {
    const rooms = await synapseService.getRoomByName(message.shortCode);
    const roomExists = rooms.length >= 1;
    const multipleRooms = rooms.length > 1;
    if (multipleRooms) {
      logger.logError(
        'Multiple rooms with the same name found. This is not supported',
        { rooms }
      );
    }
    if (!roomExists) {
      logger.logInfo('Room does not exist. Creating new room', {
        roomName: message.shortCode,
      });
      const result = await synapseService.createRoom(
        message.shortCode,
        message.title,
        validUsers
      );

      const room = await synapseService.getRoomByName(message.shortCode);
      logger.logInfo('Room created', {
        result: result as Record<string, unknown>,
        room,
      });
    } else {
      const users = await synapseService.invite(rooms[0].room_id, validUsers);
      const room = await synapseService.getRoomByName(message.shortCode);
      logger.logInfo('Users invited to existing room', { room, users });
    }
  } catch (err: unknown) {
    logger.logException('Error while creating chatroom: ', err, { message });
  }
};

export { createChatroom };
