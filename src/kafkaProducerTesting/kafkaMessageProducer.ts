import { Kafka, Producer, ProducerRecord, SASLOptions } from 'kafkajs';
import { ProduceType, SetupConfig } from '../models/KafkaTypes';
import { logger } from '@user-office-software/duo-logger';

export default class ProducerService {
  private kafka: Kafka;
  private producer: Producer;

  async setup({ clientId, brokers, ssl, sasl }: SetupConfig) {
    this.kafka = new Kafka({
      clientId,
      brokers,
    });
    this.producer = this.kafka.producer();
  }

  async connect() {
    try {
      console.log('producer connecting ....');
      await this.producer.connect();
      console.log('producer connected ....');
    } catch (e) {
      console.error(e);
    }
  }

  async disconnect() {
    await this.producer.disconnect();
  }

  async produce(record: ProducerRecord) {
    await this.producer.send(record);
  }
}

export class ProduceMessage {
  constructor(private readonly _kafka: ProducerService) {}

  async create({ topic, topicMessage }: ProduceType) {
    try {
      await this._kafka.produce({
        topic: topic,
        messages: [
          {
            value: Buffer.from(
              JSON.stringify({
                proposal: topicMessage.proposal,
                instrument: topicMessage.instrument,
                source: topicMessage.source,
                message: topicMessage.message,
              })
            ),
          },
        ],
      });
    } catch (e) {
      console.error('create topic error: ', e);
    }
  }
}

export const producerConnect = async ({ interval = 5000 }) => {
  const producer = new ProducerService();
  const produce = new ProduceMessage(producer);

  const test = {
    topic: 'create-notification',
    topicMessage: {
      proposal: `!cxjuIYTfQUofsMzKRp`,
      instrument: 'scicat instrument',
      source: 'NICOS',
      message: `Some messages sent via kafka `,
    },
  };

  await producer.setup({
    clientId: process.env.KAFKA_CLIENTID || 'create-client',
    brokers: [`${process.env.KAFKA_BROKERS}:9092`],
  });
  await producer
    .connect()
    .catch((err) => console.error('Producer connection error: ', err));
  setInterval(() => {
    produce
      .create({
        topic: test.topic,
        topicMessage: {
          proposal: test.topicMessage.proposal,
          instrument: test.topicMessage.instrument,
          source: test.topicMessage.source,
          message: `${
            test.topicMessage.message
          } ${new Date().toLocaleString()} `,
        },
      })
      .then(() =>
        logger.logInfo(`Message sent ${new Date().toLocaleString()}`, {})
      )
      .catch((err) => console.error('Producer error: ', err));
  }, interval);
};
