import { logger } from '@user-office-software/duo-logger';
import { EachMessagePayload } from 'kafkajs';

export const TopicConsumerCallback = async ({
  topic,
  partition,
  message,
}: EachMessagePayload) => {
  try {
    const messageVal = JSON.parse(message.value?.toString() as string);
    const partitionVal = partition.toString();
    const topicVal = topic.toString();

    console.log('Consumer received messages', {
      value: messageVal,
      partition: partitionVal,
      topic: topicVal,
    });
    // logger.logInfo('Consumer received messages: ', {
    //   value: messageVal,
    //   partition: partitionVal,
    //   topic: topicVal,
    // });
  } catch (err) {
    logger.logException('Error while handling Nicos consumer callback: ', {
      topic: topic,
      partition: partition,
      message: message,
      err,
    });
  }
};
