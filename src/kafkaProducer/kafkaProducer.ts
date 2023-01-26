import { Kafka, Producer, ProducerRecord, SASLOptions } from 'kafkajs';

interface setupConfig {
  clientId: string;
  brokers: string[];
  ssl: boolean;
  sasl: SASLOptions;
}

export default class ProducerService {
  private kafka: Kafka;
  private producer: Producer;
  async setup({ clientId, brokers, ssl, sasl }: setupConfig) {
    this.kafka = new Kafka({
      clientId,
      brokers,
      ssl,
      sasl,
    });
    this.producer = this.kafka.producer();
  }
  async connect() {
    try {
      console.log('connecting--');
      await this.producer.connect();
      console.log('connected--');
    } catch (e) {
      console.log(e);
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

  async create(topic: string) {
    console.log('---create call');
    await this._kafka.produce({
      topic: topic || 'create-notification',
      messages: [{ value: 'This is a randome value' }],
    });
  }
}
