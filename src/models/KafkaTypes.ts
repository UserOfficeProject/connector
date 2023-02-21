import { PartitionAssigner, SASLOptions } from 'kafkajs';

export type NicosMessageData = {
  proposal: string;
  instrument: string;
  source: string;
  message: string;
};

export interface ProduceType {
  topicMessage: NicosMessageData;
  topic: string;
}
export interface SetupConfig {
  clientId: string;
  brokers: string[];
  ssl?: boolean;
  sasl?: SASLOptions;
  retry?: RetryOptions;
}
// Note: Doc link - https://kafka.js.org/docs/1.10.0/configuration#retry
export interface RetryOptions {
  maxRetryTime?: number;
  initialRetryTime?: number;
  retries?: number;
  factor?: number;
  multiplier?: number;
}

// Note: Doc link - https://kafka.js.org/docs/consuming
export interface ConsumerOptions {
  partitionAssigners?: PartitionAssigner[];
  metadataMaxAge?: number;
  sessionTimeout?: number;
  rebalanceTimeout?: number;
  heartbeatInterval?: number;
  maxBytesPerPartition?: number;
  minBytes?: number;
  maxBytes?: number;
  maxWaitTimeInMs?: number;
  retry?: RetryOptions & {
    restartOnFailure?: (err: Error) => Promise<boolean>;
  };
  allowAutoTopicCreation?: boolean;
  maxInFlightRequests?: number;
  readUncommitted?: boolean;
  rackId?: string;
}

export interface subscribeOption {
  fromBeginning?: boolean;
}
