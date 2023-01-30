import { logger } from '@user-office-software/duo-logger';
import ConsumerService from './consumers/KafkaConsumer';
import { TopicSciChatConsumer } from './consumers/nicos/NicosTopicConsumer';

const connect = async (clientId: string) => {
  const kafka = new ConsumerService();

  // TODO: remove ssl and sasl if Nicos's producer don't use it.
  kafka
    .setup({
      clientId: process.env.KAFKA_CLIENTID || clientId,
      brokers: [`${process.env.KAFKA_BROKERS}:9092`],
      // ssl: false,
      // sasl: {
      //   mechanism: 'plain',
      //   username: process.env.KAFKA_USERNAME || 'test',
      //   password: process.env.KAFKA_PASSWORD || 'test',
      // },
    })
    .then(() => {
      logger.logInfo('Consumer setup configured', {
        clientId: process.env.KAFKA_CLIENTID,
        brokers: [`${process.env.KAFKA_BROKERS}:9092`],
      });
    })
    .catch((err) => {
      logger.logError('Consumer setup configure error ', err);
    });

  return kafka;
};

const startKafkaTopicHandling = async (): Promise<void> => {
  const test_clientId = 'create-client';
  const test_topic = 'create-notification';

  const kafkaConsumer = await connect(test_clientId);
  const topicSciChatConsumer = new TopicSciChatConsumer(kafkaConsumer);
  topicSciChatConsumer.start(test_topic);
};

export default startKafkaTopicHandling;
