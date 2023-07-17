import { container } from 'tsyringe';

import { MoodleFolderCreationQueueConsumer } from './consumers/moodle/MoodleFolderCreationQueueConsumer';
import { ChatroomCreationQueueConsumer } from './consumers/scicat/scicatProposal/consumers/ChatroomCreationQueueConsumer';
import { FolderCreationQueueConsumer } from './consumers/scicat/scicatProposal/consumers/FolderCreationQueueConsumer';
import { ProposalCreationQueueConsumer } from './consumers/scicat/scicatProposal/consumers/ProposalCreationQueueConsumer';
import { GetMessageBroker } from './messageBroker/getMessageBroker';
import { Tokens } from '../config/Tokens';
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
const ENABLE_MOODLE_FOLDERS_CREATION = str2Bool(
  process.env.ENABLE_MOODLE_FOLDERS_CREATION as string
);

const getMessageBroker: GetMessageBroker = container.resolve(
  Tokens.ProvideMessageBroker
);

const startQueueHandling = async (): Promise<void> => {
  const messageBroker = await getMessageBroker();

  if (ENABLE_SCICAT_PROPOSAL_UPSERT) {
    new ProposalCreationQueueConsumer(messageBroker);
  }
  if (ENABLE_SCICHAT_ROOM_CREATION) {
    new ChatroomCreationQueueConsumer(messageBroker);
  }
  if (ENABLE_PROPOSAL_FOLDERS_CREATION) {
    new FolderCreationQueueConsumer(messageBroker);
  }
  if (ENABLE_MOODLE_FOLDERS_CREATION) {
    new MoodleFolderCreationQueueConsumer(messageBroker);
  }
};

export default startQueueHandling;
