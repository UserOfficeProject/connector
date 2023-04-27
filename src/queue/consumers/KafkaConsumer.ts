import { logger } from '@user-office-software/duo-logger';
import {
  Consumer,
  ConsumerSubscribeTopics,
  ConsumerRunConfig,
  Kafka,
  RetryOptions,
  KafkaJSNonRetriableError,
  KafkaJSNumberOfRetriesExceeded,
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
    initialRetryTime: 300, // initial amount of time in ms to wait before retrying
    retries: 10, // Max number of retries per call
  };

  private readonly consumerOptions: ConsumerOptions = {
    maxInFlightRequests: 10, // Limit the number of concurrent requests sent to Kafka brokers.
    retry: {
      retries: 5,
    },
  };

  private readonly subscribeOption: subscribeOption = {
    fromBeginning: false,
  };

  private shouldRestart(error: Error): boolean {
    const isNonRetriableError = error instanceof KafkaJSNonRetriableError;
    const isNumberOfRetriesExceeded =
      error instanceof KafkaJSNumberOfRetriesExceeded;

    return isNonRetriableError && !isNumberOfRetriesExceeded;
  }

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
    let retries = 5;
    const consumer: Consumer = this.kafka.consumer({
      groupId: groupId,
      ...this.consumerOptions,
    });
    consumer.on('consumer.crash', async (event) => {
      // NOTE: Kafka consumer automatically restarts on retriable error
      // For non-retriable errors we need to manually create loop to re-start.
      while (retries > 0) {
        if (!this.shouldRestart(event.payload.error)) break;
        logger.logError('Consumer crashed: ', {
          message: 'Consumer crashed on non-retriable error: restarting',
          context: this.kafka.consumer.name,
          error: event.payload.error,
        });

        await this.disconnect();

        try {
          const newConsumer: Consumer = this.kafka.consumer({
            groupId: groupId,
            ...this.consumerOptions,
          });
          await consumer.connect();
          await newConsumer.subscribe({
            topics: topic.topics,
            ...this.subscribeOption,
          });
          await newConsumer.run(config);
          logger.logWarn('Restart consumer: ', {
            context: this.kafka.consumer.name,
            message: 'Restarted Consumer on non-retriable error',
          });
        } catch (error) {
          logger.logException('Error restarting consumer', error);
        }

        retries--;

        await new Promise((resolve) => setTimeout(resolve, 10000));
      }
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
  }
}
