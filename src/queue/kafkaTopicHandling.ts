import { logger } from '@user-office-software/duo-logger';
import ConsumerService from './consumers/KafkaConsumer';
import { TopicSciChatConsumer } from './consumers/nicos/NicosConsumer';

const connect = async () => {
  const kafka = new ConsumerService();

  kafka
    .setup({
      clientId: process.env.KAFKA_CLIENTID || 'create-client',
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
  const kafkaConsumer = await connect();
  const topicSciChatConsumer = new TopicSciChatConsumer(kafkaConsumer);
  topicSciChatConsumer.start('create-notification');
};

export default startKafkaTopicHandling;
