import { SynapseService } from '../../../../services/synapse/SynapseService';
import { logger } from '@user-office-software/duo-logger';
import { str2Bool } from '../../../../config/utils';

const enableNicosToSciChatMessages = str2Bool(process.env.ENABLE_NICOS_TO_SCICHAT_MESSAGES as string);

let synapseService: SynapseService | null = null;

function instantiateSynapseService4Nicos() {
  if ( enableNicosToSciChatMessages ) {
    synapseService = new SynapseService();
  }
}

const postNicosMessage = async ({
  roomId,
  message,
}: {
  roomId: string;
  message: string;
}) => {
  if ( !synapseService) {
    logger.logInfo('SciChat service unavailable',{})
    return;
  }
  if ( !enableNicosToSciChatMessages ) {
    logger.logInfo('SciChat room creation disabled',{})
    return;
  }

  await synapseService.joinRoom(roomId);
  await synapseService.sendMessage(roomId, message);
};

export { postNicosMessage, instantiateSynapseService4Nicos };
