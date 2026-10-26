import { validateExperimentMessage } from './validateExperimentMessage';

describe('validateExperimentMessage', () => {
  it('should throw error when message is not valid', () => {
    expect(() => validateExperimentMessage({ message: 'message' })).toThrow();
  });

  it('should throw when experimentId is missing', () => {
    expect(() =>
      validateExperimentMessage({
        experimentPk: 1,
        startsAt: new Date(),
        endsAt: new Date(),
        status: 'ALLOCATED',
      })
    ).toThrow('Experiment ID is missing');
  });

  it('should throw when experimentPk is missing', () => {
    expect(() =>
      validateExperimentMessage({
        experimentId: 'exp-123',
        startsAt: new Date(),
        endsAt: new Date(),
        status: 'ALLOCATED',
      })
    ).toThrow('Experiment primary key is missing');
  });

  it('should not throw when message is valid', () => {
    expect(() =>
      validateExperimentMessage({
        experimentId: 'exp-123',
        experimentPk: 1,
        startsAt: new Date(),
        endsAt: new Date(),
        status: 'ALLOCATED',
      })
    ).not.toThrow();
  });
});
