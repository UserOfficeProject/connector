import { ProposalMessageData } from '../../../../../models/ProposalMessage';

export interface VisitMessage {
  id: string;
  startAt: string;
  endAt: string;
  visitorId: string;
  proposal: ProposalMessageData;
}
