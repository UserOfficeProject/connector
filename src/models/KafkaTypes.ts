import { SASLOptions } from 'kafkajs';

export interface TopicMessage {
  proposal: string;
  instrument: string;
  source: string;
  message: string;
}

export interface ProduceType {
  topicMessage: TopicMessage;
  topic: string;
}

export interface SetupConfig {
  clientId: string;
  brokers: string[];
  ssl?: boolean;
  sasl?: SASLOptions;
}
