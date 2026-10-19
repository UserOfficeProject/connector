import { isVisitMessage } from './isVisitMessage';

describe('isVisitMessage', () => {
  it('should return false if message is not an object', () => {
    const message = 'not an object';
    expect(isVisitMessage(message)).toBe(false);
  });

  it('should return false if message is null', () => {
    const message = null;
    expect(isVisitMessage(message)).toBe(false);
  });

  it('should return false if visitorId is undefined', () => {
    const message = {
      startAt: '2023-01-01T00:00:00Z',
      endAt: '2023-01-02T00:00:00Z',
    };
    expect(isVisitMessage(message)).toBe(false);
  });

  it('should return false if startAt is undefined', () => {
    const message = {
      visitorId: 'visitor123',
      endAt: '2023-01-02T00:00:00Z',
    };
    expect(isVisitMessage(message)).toBe(false);
  });

  it('should return false if endAt is undefined', () => {
    const message = {
      visitorId: 'visitor123',
      startAt: '2023-01-01T00:00:00Z',
    };
    expect(isVisitMessage(message)).toBe(false);
  });

  it('should return false if proposal is undefined', () => {
    const message = {
      visitorId: 'visitor123',
      startAt: '2023-01-01T00:00:00Z',
      endAt: '2023-01-02T00:00:00Z',
    };
    expect(isVisitMessage(message)).toBe(false);
  });

  it('should return false if id is undefined', () => {
    const message = {
      visitorId: 'visitor123',
      startAt: '2023-01-01T00:00:00Z',
      endAt: '2023-01-02T00:00:00Z',
      proposal: {
        shortCode: 'proposal-short-code',
      },
    };
    expect(isVisitMessage(message)).toBe(false);
  });

  it('should return false if registrationAnswers is malformed', () => {
    const message = {
      id: 'visit123',
      visitorId: 'visitor123',
      startAt: '2023-01-01T00:00:00Z',
      endAt: '2023-01-02T00:00:00Z',
      proposal: {
        shortCode: 'proposal-short-code',
      },
      registrationAnswers: 'not-an-array',
    };

    expect(isVisitMessage(message)).toBe(false);
  });

  it('should return true if the message includes valid registration answers', () => {
    const message = {
      id: 'visit123',
      visitorId: 'visitor123',
      startAt: '2023-01-01T00:00:00Z',
      endAt: '2023-01-02T00:00:00Z',
      proposal: {
        shortCode: 'proposal-short-code',
      },
      registrationAnswers: [
        { questionNaturalKey: 'request_daily_allowance', value: true },
      ],
    };

    expect(isVisitMessage(message)).toBe(true);
  });

  it('should return true if the message is valid', () => {
    const message = {
      id: 'visit123',
      visitorId: 'visitor123',
      startAt: '2023-01-01T00:00:00Z',
      endAt: '2023-01-02T00:00:00Z',
      proposal: {
        shortCode: 'proposal-short-code',
      },
    };
    expect(isVisitMessage(message)).toBe(true);
  });
});
