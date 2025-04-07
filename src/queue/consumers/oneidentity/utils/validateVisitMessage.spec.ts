import { validateVisitMessage } from './validateVisitMessage';

describe('validateVisitMessage', () => {
  it('should throw an error if message is not an object', () => {
    const message = 'not an object';

    expect(() => validateVisitMessage(message)).toThrow(
      'Invalid Visit message'
    );
  });

  it('should throw an error if message is null', () => {
    const message = null;

    expect(() => validateVisitMessage(message)).toThrow(
      'Invalid Visit message'
    );
  });

  it('should throw an error if visitorId is undefined', () => {
    const message = {
      startAt: '2023-01-01T00:00:00Z',
      endAt: '2023-01-02T00:00:00Z',
    };

    expect(() => validateVisitMessage(message)).toThrow(
      'Invalid Visit message'
    );
  });

  it('should throw an error if startAt is undefined', () => {
    const message = {
      visitorId: 'visitor123',
      endAt: '2023-01-02T00:00:00Z',
    };

    expect(() => validateVisitMessage(message)).toThrow(
      'Invalid Visit message'
    );
  });

  it('should throw an error if endAt is undefined', () => {
    const message = {
      visitorId: 'visitor123',
      startAt: '2023-01-01T00:00:00Z',
    };

    expect(() => validateVisitMessage(message)).toThrow(
      'Invalid Visit message'
    );
  });

  it('should return the message if visitorId, startAt, and endAt are defined', () => {
    const message = {
      visitorId: 'visitor123',
      startAt: '2023-01-01T00:00:00Z',
      endAt: '2023-01-02T00:00:00Z',
    };

    expect(validateVisitMessage(message)).toEqual(message);
  });
});
