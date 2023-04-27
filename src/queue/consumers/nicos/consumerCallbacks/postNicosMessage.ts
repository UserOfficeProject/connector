import { container } from 'tsyringe';

import { Tokens } from '../../../../config/Tokens';
import { SynapseService } from '../../../../services/synapse/SynapseService';

const postNicosMessage = async ({
  roomName,
  message,
}: {
  roomName: string;
  message: string;
}) => {
  const synapseService: SynapseService = container.resolve(
    Tokens.SynapseService
  );
  await synapseService.sendMessage(roomName, message);
};

export { postNicosMessage };
