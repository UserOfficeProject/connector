import 'reflect-metadata';
import { configureConsoleLogger } from './logger/configureConsoleLogger';
import { Tokens } from './Tokens';
import { mapValue } from './utils';
import getMockMqMessageBroker from '../queue/messageBroker/getMockMessageBroker';

mapValue(Tokens.ConfigureLogger, configureConsoleLogger);
mapValue(Tokens.ProvideMessageBroker, getMockMqMessageBroker);

mapValue(Tokens.VisaInstrumentDataSource, undefined);
mapValue(Tokens.VisaProposalDataSource, undefined);
mapValue(Tokens.VisaExperimentDataSource, undefined);
mapValue(Tokens.VisaExperimentUserDataSource, undefined);
mapValue(Tokens.VisaUserDataSource, undefined);
