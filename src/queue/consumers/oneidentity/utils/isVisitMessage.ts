import { VisitMessage } from './interfaces/VisitMessage';

export function isVisitMessage(message: any): message is VisitMessage {
  return (
    message != null &&
    typeof message === 'object' &&
    'id' in message &&
    'visitorId' in message &&
    'startAt' in message &&
    'endAt' in message &&
    'proposal' in message &&
    (!('registrationAnswers' in message) ||
      (Array.isArray(message.registrationAnswers) &&
        message.registrationAnswers.every(
          (answer: any) =>
            answer != null &&
            typeof answer === 'object' &&
            typeof answer.questionNaturalKey === 'string' &&
            'value' in answer
        )))
  );
}
