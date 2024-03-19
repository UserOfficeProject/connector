import { container } from 'tsyringe';

import { MoodleFolderCreationQueueConsumer } from './consumers/moodle/MoodleFolderCreationQueueConsumer';
import { OneIdentityIntegrationQueueConsumer } from './consumers/oneidentity/OneIdentityIntegrationQueueConsumer';
import { ChatroomCreationQueueConsumer } from './consumers/scicat/scicatProposal/consumers/ChatroomCreationQueueConsumer';
import { FolderCreationQueueConsumer } from './consumers/scicat/scicatProposal/consumers/FolderCreationQueueConsumer';
import { ProposalCreationQueueConsumer } from './consumers/scicat/scicatProposal/consumers/ProposalCreationQueueConsumer';
import { GetMessageBroker } from './messageBroker/getMessageBroker';
import { Tokens } from '../config/Tokens';
import { str2Bool } from '../config/utils';

const getMessageBroker: GetMessageBroker = container.resolve(
  Tokens.ProvideMessageBroker
);

const queueConsumers = {
  ENABLE_SCICAT_PROPOSAL_UPSERT: ProposalCreationQueueConsumer,
  ENABLE_SCICHAT_ROOM_CREATION: ChatroomCreationQueueConsumer,
  ENABLE_PROPOSAL_FOLDERS_CREATION: FolderCreationQueueConsumer,
  ENABLE_MOODLE_FOLDERS_CREATION: MoodleFolderCreationQueueConsumer,
  ENABLE_ONE_IDENTITY_INTEGRATION: OneIdentityIntegrationQueueConsumer,
};

const startQueueHandling = async (): Promise<void> => {
  const messageBroker = await getMessageBroker();

  for (const [envVar, QueueConsumer] of Object.entries(queueConsumers)) {
    if (str2Bool(process.env[envVar] as string)) {
      new QueueConsumer(messageBroker);
    }
  }
};

export default startQueueHandling;
