import { logger } from '@user-office-software/duo-logger';
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

  // TODO: remove ssl and sasl, if Nicos's producer don't use it
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
      .catch((e) => logger.logException('Error consumer connection fail', e));
    await consumer
      .subscribe(topic)
      .catch((e) =>
        logger.logException('Error consumer subscribe to topic fail', e)
      );
    await consumer
      .run(config)
      .catch((e) =>
        logger.logException('Error consumer consumes message fail', e)
      );
    this.consumers.push(consumer);

    // NOTE: if consumer re-joining issue happens, we should consider to include disconnect()
    // otherwise just leave it.

    // this.disconnect();
  }
}
