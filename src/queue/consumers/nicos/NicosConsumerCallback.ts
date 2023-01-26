import { EachMessagePayload } from 'kafkajs';

export const TopicConsumerCallback = async ({
  topic,
  partition,
  message,
}: EachMessagePayload) => {
  console.log('Posted messages: ', {
    value: message.value?.toString(),
    partition: partition.toString(),
    topic: topic.toString(),
  });
};
