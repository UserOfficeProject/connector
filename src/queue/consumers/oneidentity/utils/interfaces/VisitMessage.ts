import { ProposalMessageData } from '../../../../../models/ProposalMessage';

export interface VisitRegistrationAnswer {
  questionNaturalKey: string;
  value: unknown;
}

export interface VisitMessage {
  id: string;
  startAt: string;
  endAt: string;
  visitorId: string;
  proposal: ProposalMessageData;
  registrationAnswers?: VisitRegistrationAnswer[];
}
