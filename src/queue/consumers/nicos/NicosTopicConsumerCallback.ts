import { EachMessagePayload } from 'kafkajs';
import { postNicosMessage } from './consumerCallbacks/postNicosMessage';

export const TopicConsumerCallback = async ({
  message,
}: EachMessagePayload) => {
  const messageVal = JSON.parse(message.value?.toString() as string);

  const nicosMessage = {
    roomId: messageVal.proposal,
    // instrument: messageVal.instrument,
    // source: messageVal.source,
    message: messageVal.message,
  };

  await postNicosMessage({
    roomId: nicosMessage.roomId,
    message: nicosMessage.message,
  });
};
