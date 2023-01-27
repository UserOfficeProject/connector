import { Kafka, Producer, ProducerRecord, SASLOptions } from 'kafkajs';
import { ProduceType, SetupConfig } from '../models/KafkaTypes';

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
      console.log('connecting--');
      await this.producer.connect();
      console.log('connected--');
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

export const producerConnect = async () => {
  const producer = new ProducerService();
  const produce = new ProduceService(producer);

  const INTERVAL = 3000;
  let num = 1;
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
  await producer.connect();
  setInterval(
    () =>
      produce.create({
        topic: 'create-notification',
        topicMessage: {
          proposal: `scicat proposal ${num++}`,
          instrument: 'scicat instrument',
          source: 'NICOS',
          message: 'some messages goes here',
        },
      }),
    INTERVAL
  );
};
