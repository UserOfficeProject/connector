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
      // ssl,
      // sasl,
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

export class ProduceService {
  constructor(private readonly _kafka: ProducerService) {}

  public message = 'some messages goes in here?';

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

export const producerConnect = async ({ interval = 5000, num = 1 }) => {
  const producer = new ProducerService();
  const produce = new ProduceService(producer);

  await producer.setup({
    clientId: process.env.KAFKA_CLIENTID || 'create-client',
    brokers: [`${process.env.KAFKA_BROKERS}:9092`],
    // ssl: false,
    sasl: {
      mechanism: 'plain',
      username: process.env.KAFKA_USERNAME || 'test',
      password: process.env.KAFKA_PASSWORD || 'test',
    },
  });
  await producer
    .connect()
    .catch((err) => logger.logError('producer connection error', err));
  setInterval(() => {
    produce
      .create({
        topic: 'create-notification',
        topicMessage: {
          proposal: `scicat proposal ${num}`,
          instrument: 'scicat instrument',
          source: 'NICOS',
          message: 'some messages goes here',
        },
      })
      .then(() => logger.logInfo(`Message sent ${num}`, {}))
      .catch();
    num++;
  }, interval);
};
