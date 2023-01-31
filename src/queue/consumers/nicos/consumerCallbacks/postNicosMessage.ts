import { SynapseService } from '../../../../models/SynapseService';

const synapseService = new SynapseService();

const postNicosMessage = async ({
  roomId,
  message,
}: {
  roomId: string;
  message: string;
}) => {
  await synapseService.joinRoom(roomId);
  await synapseService.sendMessage(roomId, message);
};

export { postNicosMessage };
