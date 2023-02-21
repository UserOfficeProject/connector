import { SynapseService } from '../../../../services/synapse/SynapseService';

const synapseService: SynapseService = new SynapseService();

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
