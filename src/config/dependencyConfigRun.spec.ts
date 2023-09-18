jest.mock('./utils');

import { configureGraylogLogger } from './logger/configureGrayLogLogger';
import { Tokens } from './Tokens';
import { mapValue } from './utils';
import getRabbitMqMessageBroker from '../queue/messageBroker/getRabbitMqMessageBroker';

describe('dependencyConfigRun', () => {
  beforeEach(() => {
    (mapValue as jest.Mock).mockReturnValue(undefined);
  });

  it('should register the correct functions', () => {
    require('./dependencyConfigRun');

    expect(mapValue).toHaveBeenCalledTimes(3);

    expect(mapValue).toHaveBeenCalledWith(
      Tokens.ConfigureLogger,
      configureGraylogLogger
    );

    expect(mapValue).toHaveBeenCalledWith(
      Tokens.ProvideMessageBroker,
      getRabbitMqMessageBroker
    );

    expect(mapValue).toHaveBeenCalledWith(Tokens.SynapseService, {});
  });
});
