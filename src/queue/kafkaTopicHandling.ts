import { logger } from '@user-office-software/duo-logger';
import ConsumerService from './consumers/KafkaConsumer';
import { TopicSciChatConsumer } from './consumers/nicos/NicosConsumer';

const connect = async () => {
  const kafka = new ConsumerService();

  kafka
    .setup({
      clientId: 'create-client',
      brokers: ['dasd'],
      ssl: true,
      sasl: {
        mechanism: 'plain',
        username: 'my-username',
        password: 'my-password',
      },
    })
    .then(() => {
      logger.logInfo('Connected to Kafka', {
        hostname: process.env.RABBITMQ_HOSTNAME,
        username: process.env.RABBITMQ_USERNAME,
        password: '********',
      });
    });

  return kafka;
};

const startKafkaTopicHandling = async (): Promise<void> => {
  const kafkaConsumer = await connect();
  const topicSciChatConsumer = new TopicSciChatConsumer(kafkaConsumer);
  topicSciChatConsumer.start();
};

export default startKafkaTopicHandling;
