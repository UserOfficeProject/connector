import ConsumerService from '../KafkaConsumer';
import { TopicConsumerCallback } from './NicosConsumerCallback';

export class TopicSciChatConsumer {
  constructor(private _consumer: ConsumerService) {}
  async start() {
    this._consumer.consume(
      'create-client',
      { topics: ['create-notification'], fromBeginning: true },
      { eachMessage: TopicConsumerCallback }
    );
  }
}
