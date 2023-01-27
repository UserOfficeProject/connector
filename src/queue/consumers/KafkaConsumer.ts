import {
  Consumer,
  ConsumerSubscribeTopics,
  ConsumerRunConfig,
  Kafka,
} from 'kafkajs';
import { SetupConfig } from '../../models/KafkaTypes';

export default class ConsumerService {
  private kafka: Kafka;
  private consumers: Consumer[] = [];

  async setup({ clientId, brokers, ssl, sasl }: SetupConfig) {
    this.kafka = new Kafka({
      clientId,
      brokers,
      // ssl,
      // sasl,
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
      .catch((e) => console.error('Consumer connection error: ', e)); // TODO improve error handling
    await consumer
      .subscribe(topic)
      .catch((e) => console.error('Subscribe error: ', e));
    await consumer
      .run(config)
      .catch((e) => console.error('Message consume error: ', e));
    this.consumers.push(consumer);
    // this.disconnect();
  }
}
