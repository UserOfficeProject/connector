import { SynapseService } from '../../../../models/SynapseService';

const synapseService = new SynapseService();

const postNicosMessage = async ({
  roomName,
  message,
}: {
  roomName: string;
  message: string;
}) => {
  await synapseService.sendMessage(roomName, message);
};

export { postNicosMessage };
