import { VisitMessage } from './interfaces/VisitMessage';

export function validateVisitMessage(message: any): VisitMessage | never {
  if (
    message?.visitorId === undefined ||
    message?.startAt === undefined ||
    message?.endAt === undefined ||
    message?.proposal === undefined
  ) {
    throw new Error('Invalid Visit message');
  }

  return message;
}
