import {
  Consumer,
  ConsumerSubscribeTopics,
  ConsumerRunConfig,
  Kafka,
  SASLOptions,
} from 'kafkajs';

interface setupConfig {
  clientId: string;
  brokers: string[];
  ssl: boolean;
  sasl: SASLOptions;
}

export default class ConsumerService {
  private kafka: Kafka;
  private consumers: Consumer[] = [];

  async setup({ clientId, brokers, ssl, sasl }: setupConfig) {
    this.kafka = new Kafka({
      clientId,
      brokers,
      ssl,
      sasl,
    });
  }

  async disconnect() {
    for (const consumer of this.consumers) {
      await consumer.disconnect();
    }
  }

  async consume(
    groupId: string,
    topic: ConsumerSubscribeTopics,
    config: ConsumerRunConfig
  ) {
    const consumer: Consumer = this.kafka.consumer({ groupId: groupId });
    await consumer
      .connect()
      .catch((e) => console.error('Connection error: ', e)); // TODO improve error handling
    await consumer.subscribe(topic);
    await consumer.run(config);
    this.consumers.push(consumer);
    // this.disconnect();
  }
}
