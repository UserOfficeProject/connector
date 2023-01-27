import ConsumerService from '../KafkaConsumer';
import { TopicConsumerCallback } from './NicosConsumerCallback';

export class TopicSciChatConsumer {
  constructor(private _consumer: ConsumerService) {}
  async start(topic: string) {
    this._consumer.consume(
      'create-client',
      { topics: [topic], fromBeginning: true },
      { eachMessage: TopicConsumerCallback }
    );
  }
}
