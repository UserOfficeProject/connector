import { ScicatProposalQueueConsumer } from './consumers/scicat/scicatProposal/ScicatProposalQueueConsumer';

const startQueueHandling = async (): Promise<void> => {
  new ScicatProposalQueueConsumer();
};

export default startQueueHandling;
