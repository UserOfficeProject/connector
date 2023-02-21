import { logger } from '@user-office-software/duo-logger';

import { TopicSciChatConsumer } from './consumers/nicos/NicosTopicConsumer';
import { connect } from './messageBroker/getKafkaMessageBroker';

const startKafkaTopicHandling = async (): Promise<void> => {
  try {
    const kafkaConsumer = await connect(process.env.KAFKA_CLIENTID || '');
    const topicSciChatConsumer = new TopicSciChatConsumer(kafkaConsumer);
    topicSciChatConsumer.start(process.env.KAFKA_TOPIC || '');
  } catch (reason) {
    logger.logException('Failed to start consumer', { reason });
    throw reason;
  }
};

export default startKafkaTopicHandling;
