import { logger } from '@user-office-software/duo-logger';
import { Kafka, Producer, ProducerRecord } from 'kafkajs';

import {
  ProduceType,
  SetupConfig,
  NicosMessageData,
} from '../models/KafkaTypes';

export default class ProducerService {
  private kafka: Kafka;
  private producer: Producer;

  async setup({ clientId, brokers, retry }: SetupConfig) {
    this.kafka = new Kafka({
      clientId,
      brokers,
      retry,
    });
    this.producer = this.kafka.producer();
  }

  async connect() {
    try {
      logger.logInfo('producer connecting ....', {});
      await this.producer.connect();
      logger.logInfo('producer connected ....', {});
    } catch (reason) {
      logger.logError('connect fail', { reason });
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
                message: `${
                  topicMessage.message
                } - ${new Date().toLocaleString()}`,
              })
            ),
          },
        ],
      });
    } catch (error) {
      logger.logError('create topic error: ', { error });
    }
  }
}

export const producerConnect = async ({
  topic = '',
  messages,
  msgSendingInterval = 5000,
}: {
  topic?: string;
  messages: NicosMessageData;
  msgSendingInterval: number;
}) => {
  const producer = new ProducerService();
  const produce = new ProduceMessage(producer);

  await producer.setup({
    clientId: process.env.KAFKA_CLIENTID || '',
    brokers: [`${process.env.KAFKA_BROKERS}`],
  });
  await producer
    .connect()
    .catch((reason) =>
      logger.logError('Producer connection error: ', { reason })
    );
  setInterval(() => {
    produce
      .create({
        topic: process.env.KAFKA_TOPIC || topic,
        topicMessage: messages,
      })
      .then(() =>
        logger.logInfo(`Message sent ${new Date().toLocaleString()}`, {
          messages,
        })
      )
      .catch((reason) => logger.logError('Producer error: ', { reason }));
  }, msgSendingInterval);
};
