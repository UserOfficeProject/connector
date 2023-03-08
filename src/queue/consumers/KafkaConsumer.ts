import { logger } from '@user-office-software/duo-logger';
import {
  Consumer,
  ConsumerSubscribeTopics,
  ConsumerRunConfig,
  Kafka,
  RetryOptions,
} from 'kafkajs';

import {
  ConsumerOptions,
  SetupConfig,
  subscribeOption,
} from '../../models/KafkaTypes';

export default class ConsumerService {
  private kafka: Kafka;
  private consumers: Consumer[] = [];

  private readonly retryOptions: RetryOptions = {
    maxRetryTime: 30000, // maximum amount of time in ms to retry
    initialRetryTime: 100, // initial amount of time in ms to wait before retrying
    retries: 10, // Max number of retries per call
  };

  private readonly consumerOptions: ConsumerOptions = {
    maxInFlightRequests: 10, // Limit the number of concurrent requests sent to Kafka brokers.
  };

  private readonly subscribeOption: subscribeOption = {
    fromBeginning: false,
  };

  async setup({ clientId, brokers }: SetupConfig) {
    this.kafka = new Kafka({
      clientId,
      brokers,
      retry: this.retryOptions,
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
    const consumer: Consumer = this.kafka.consumer({
      groupId: groupId,
      ...this.consumerOptions,
    });
    await consumer
      .connect()
      .catch((e) => logger.logException('Error consumer connection fail', e));
    await consumer
      .subscribe({
        topics: topic.topics,
        ...this.subscribeOption,
      })
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
