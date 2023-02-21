import { ChatroomCreationQueueConsumer } from './consumers/scicat/scicatProposal/consumers/ChatroomCreationQueueConsumer';
import { FolderCreationQueueConsumer } from './consumers/scicat/scicatProposal/consumers/FolderCreationQueueConsumer';
import { ProposalCreationQueueConsumer } from './consumers/scicat/scicatProposal/consumers/ProposalCreationQueueConsumer';
import { str2Bool } from '../config/utils';

const ENABLE_SCICAT_PROPOSAL_UPSERT = str2Bool(
  process.env.ENABLE_SCICAT_PROPOSAL_UPSERT as string
);
const ENABLE_SCICHAT_ROOM_CREATION = str2Bool(
  process.env.ENABLE_SCICHAT_ROOM_CREATION as string
);
const ENABLE_PROPOSAL_FOLDERS_CREATION = str2Bool(
  process.env.ENABLE_PROPOSAL_FOLDERS_CREATION as string
);

const startQueueHandling = async (): Promise<void> => {
  if (ENABLE_SCICAT_PROPOSAL_UPSERT) {
    new ProposalCreationQueueConsumer();
  }
  if (ENABLE_SCICHAT_ROOM_CREATION) {
    new ChatroomCreationQueueConsumer();
  }
  if (ENABLE_PROPOSAL_FOLDERS_CREATION) {
    new FolderCreationQueueConsumer();
  }
};

export default startQueueHandling;
