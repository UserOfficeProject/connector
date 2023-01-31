import { EachMessagePayload } from 'kafkajs';
import { postNicosMessage } from './consumerCallbacks/postNicosMessage';

export const TopicConsumerCallback = async ({
  message,
}: EachMessagePayload) => {
  const messageVal = JSON.parse(message.value?.toString() as string);

  // Note: NicosMessage contains 4 values - proposal, instrument, source and message.
  await postNicosMessage({
    roomId: messageVal.proposal,
    message: messageVal.message,
  });
};
