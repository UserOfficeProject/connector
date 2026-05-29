import { VisitMessage } from './interfaces/VisitMessage';

export function isVisitMessage(message: any): message is VisitMessage {
  return (
    message != null &&
    typeof message === 'object' &&
    'id' in message &&
    'visitorId' in message &&
    'startAt' in message &&
    'endAt' in message &&
    'proposal' in message
  );
}
