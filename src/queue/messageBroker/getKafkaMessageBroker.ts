import { PathOrFileDescriptor, readFileSync } from 'fs';
import { ConnectionOptions } from 'tls';

import { logger } from '@user-office-software/duo-logger';
import { SASLOptions, SASLMechanism } from 'kafkajs';

import { SetupConfig } from '../../models/KafkaTypes';
import ConsumerService from '../consumers/KafkaConsumer';

export const connect = async (clientId: string) => {
  const kafka = new ConsumerService();

  const brokers = (process.env.KAFKA_BROKERS as string).split(',');

  const kafkaConfiguration: SetupConfig = {
    clientId: process.env.KAFKA_CLIENTID || clientId,
    brokers: brokers,
  };
  if (process.env.KAFKA_SASL_ENABLED) {
    kafkaConfiguration.sasl = {
      mechanism: process.env.KAFKA_SASL_MECHANISM as SASLMechanism,
      username: process.env.KAFKA_SASL_USERNAME,
      password: process.env.KAFKA_SASL_PASSWORD,
    } as SASLOptions;
  }
  if (process.env.KAFKA_SSL_ENABLED) {
    kafkaConfiguration.ssl = {
      ca: [
        readFileSync(
          process.env.KAFKA_SSL_CA_FILE as PathOrFileDescriptor,
          'utf-8'
        ),
      ],
    } as ConnectionOptions;
  }

  // original options for the setup
  // kept it here as reference
  // {
  //   clientId: process.env.KAFKA_CLIENTID || clientId,
  //   brokers: [`${process.env.KAFKA_BROKERS}`],
  // }

  logger.logInfo(
    'Kafka consumer setup configuration ',
    kafkaConfiguration as unknown as Record<string, unknown>
  );

  kafka
    .setup(kafkaConfiguration)
    .then(() => {
      logger.logInfo(
        'Consumer setup configured',
        kafkaConfiguration as unknown as Record<string, unknown>
      );
    })
    .catch((reason) => {
      logger.logError('Consumer setup configure error ', { reason });
    });

  return kafka;
};
