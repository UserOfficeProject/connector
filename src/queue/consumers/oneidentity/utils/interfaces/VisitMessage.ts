import { ProposalMessageData } from '../../../../../models/ProposalMessage';

export interface VisitMessage {
  startAt: string;
  endAt: string;
  visitorId: string;
  proposal: ProposalMessageData;
}
