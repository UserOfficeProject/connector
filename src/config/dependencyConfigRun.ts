import 'reflect-metadata';
import { configureGraylogLogger } from './logger/configureGrayLogLogger';
import { Tokens } from './Tokens';
import { mapClass, mapValue, str2Bool } from './utils';
import VisaPostgresExperimentDataSource from '../datasources/visa/postgres/ExperimentDataSource';
import VisaPostgresExperimentUserDataSource from '../datasources/visa/postgres/ExperimentUserDataSource';
import VisaPostgresInstrumentDataSource from '../datasources/visa/postgres/InstrumentDataSource';
import VisaPostgresProposalDataSource from '../datasources/visa/postgres/ProposalDataSource';
import VisaPostgresUserDataSource from '../datasources/visa/postgres/UserDataSource';
import getRabbitMqMessageBroker from '../queue/messageBroker/getRabbitMqMessageBroker';
import { SynapseService } from '../services/synapse/SynapseService';

mapValue(Tokens.ConfigureLogger, configureGraylogLogger);
mapValue(Tokens.ProvideMessageBroker, getRabbitMqMessageBroker);

const enableNicosToScichatMessages = str2Bool(
  process.env.ENABLE_NICOS_TO_SCICHAT_MESSAGES as string
);

const enableScichatRoomCreation = str2Bool(
  process.env.ENABLE_SCICHAT_ROOM_CREATION as string
);

const enableSyncVisaProposals = str2Bool(
  process.env.ENABLE_SYNC_VISA_PROPOSALS as string
);

mapValue(
  Tokens.SynapseService,
  enableNicosToScichatMessages || enableScichatRoomCreation
    ? new SynapseService()
    : {}
);

mapClass(
  Tokens.VisaInstrumentDataSource,
  enableSyncVisaProposals ? VisaPostgresInstrumentDataSource : undefined
);

mapClass(
  Tokens.VisaProposalDataSource,
  enableSyncVisaProposals ? VisaPostgresProposalDataSource : undefined
);

mapClass(
  Tokens.VisaExperimentDataSource,
  enableSyncVisaProposals ? VisaPostgresExperimentDataSource : undefined
);

mapClass(
  Tokens.VisaExperimentUserDataSource,
  enableSyncVisaProposals ? VisaPostgresExperimentUserDataSource : undefined
);

mapClass(
  Tokens.VisaUserDataSource,
  enableSyncVisaProposals ? VisaPostgresUserDataSource : undefined
);
