import { logger } from '@user-office-software/duo-logger';

import { TopicSciChatConsumer } from './consumers/nicos/NicosTopicConsumer';
import { connect } from './messageBroker/getKafkaMessageBroker';
import { str2Bool } from '../config/utils';

const ENABLE_NICOS_TO_SCICHAT_MESSAGES = str2Bool(
  process.env.ENABLE_NICOS_TO_SCICHAT_MESSAGES as string
);

const startKafkaTopicHandling = async (): Promise<void> => {
  if (ENABLE_NICOS_TO_SCICHAT_MESSAGES) {
    try {
      const kafkaConsumer = await connect(process.env.KAFKA_CLIENTID || '');
      const topicSciChatConsumer = new TopicSciChatConsumer(kafkaConsumer);
      topicSciChatConsumer.start(process.env.KAFKA_TOPIC || '');
    } catch (reason) {
      logger.logException('Failed to start consumer', { reason });
      throw reason;
    }
  }
};

export default startKafkaTopicHandling;
