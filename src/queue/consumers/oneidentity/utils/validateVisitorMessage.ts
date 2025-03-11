import { VisitorMessage } from './interfaces/VisitorMessage';

export function validateVisitorMessage(message: any): VisitorMessage | never {
  if (
    message?.visitorId === undefined ||
    message?.startAt === undefined ||
    message?.endAt === undefined
  ) {
    throw new Error('Invalid Visitor message');
  }

  return message;
}
