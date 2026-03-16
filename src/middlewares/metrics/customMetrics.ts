import { Counter, Histogram } from 'prom-client';

// Metrics for rabbitmq message processing

// This counter tracks the total number of processed messages, with labels for the queue and status (success or failure)
export const processedMessagesCounter = new Counter({
  name: 'rabbitmq_processed_messages_total',
  help: 'Total number of processed messages from RabbitMQ',
  labelNames: ['queue', 'status'],
});

// This histogram tracks the duration of message processing. It helps monitor how long it takes to process each message.
export const processingDurationHistogram = new Histogram({
  name: 'rabbitmq_message_processing_duration_seconds',
  help: 'Duration of message processing in seconds',
  labelNames: ['queue'],
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60],
});
