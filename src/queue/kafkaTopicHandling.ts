import { TopicSciChatConsumer } from './consumers/nicos/NicosTopicConsumer';
import { connect } from './messageBroker/getKafkaMessageBroker';

const startKafkaTopicHandling = async (): Promise<void> => {
  const test_clientId = 'create-client';
  const test_topic = 'create-notification';

  const kafkaConsumer = await connect(test_clientId);
  const topicSciChatConsumer = new TopicSciChatConsumer(kafkaConsumer);
  topicSciChatConsumer.start(test_topic);
};

export default startKafkaTopicHandling;
