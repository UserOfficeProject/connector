import { EachMessagePayload } from 'kafkajs';

export const TopicConsumerCallback = async ({
  topic,
  partition,
  message,
}: EachMessagePayload) => {
  const messageValue = JSON.parse(message.value?.toString() as string);
  console.log('Consumer messages: ', {
    value: messageValue,
    partition: partition.toString(),
    topic: topic.toString(),
  });
};
