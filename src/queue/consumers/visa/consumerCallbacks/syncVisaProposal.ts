import { container } from 'tsyringe';

import { Tokens } from '../../../../config/Tokens';
import { ExperimentDataSource } from '../../../../datasources/visa/ExperimentDataSource';
import { ExperimentUserDataSource } from '../../../../datasources/visa/ExperimentUserDataSource';
import { InstrumentDataSource } from '../../../../datasources/visa/InstrumentDataSource';
import { ProposalDataSource } from '../../../../datasources/visa/ProposalDataSource';
import { UserDataSource } from '../../../../datasources/visa/UserDataSource';
import { ProposalUser } from '../../scicat/scicatProposal/dto';
import { ValidProposalMessageData } from '../../utils/validateProposalMessage';

async function createUserAndAssignToExperiment(
  user: ProposalUser,
  proposalPk: number
) {
  const userDataSource = container.resolve<UserDataSource>(
    Tokens.VisaUserDataSource
  );

  const experimentDataSource = container.resolve<ExperimentDataSource>(
    Tokens.VisaExperimentDataSource
  );

  const experimentUserDataSource = container.resolve<ExperimentUserDataSource>(
    Tokens.VisaExperimentUserDataSource
  );

  const createdUser = await userDataSource.create(user);
  console.log({ createdUser });
  const experiment = await experimentDataSource.getByProposalId(proposalPk);
  if (experiment && createdUser) {
    await experimentUserDataSource.create({
      experimentId: experiment.id,
      userId: createdUser.id,
    });
  }
}

async function deleteMissingUsersFromExperiment(
  proposalPk: number,
  allProposalUsers: ProposalUser[]
) {
  const experimentDataSource = container.resolve<ExperimentDataSource>(
    Tokens.VisaExperimentDataSource
  );
  const experimentUserDataSource = container.resolve<ExperimentUserDataSource>(
    Tokens.VisaExperimentUserDataSource
  );

  const experiment = await experimentDataSource.getByProposalId(proposalPk);
  if (!experiment) return;

  const experimentUsers =
    await experimentUserDataSource.getAllUsersByExperimentId(
      experiment.id.toString()
    );

  for (const experimentUser of experimentUsers) {
    if (
      !allProposalUsers.some((member) => member.email === experimentUser.email)
    ) {
      await experimentUserDataSource.delete({
        experimentId: experiment.id,
        userId: experimentUser.id,
      });
    }
  }
}
export async function syncVisaProposal(
  proposalWithNewStatus: ValidProposalMessageData
) {
  const proposalDatasource = container.resolve<ProposalDataSource>(
    Tokens.VisaProposalDataSource
  );

  const experimentDataSource = container.resolve<ExperimentDataSource>(
    Tokens.VisaExperimentDataSource
  );

  const instrumentDataSource = container.resolve<InstrumentDataSource>(
    Tokens.VisaInstrumentDataSource
  );

  // Create New Proposal
  let proposal = await proposalDatasource.get(proposalWithNewStatus.proposalPk);
  if (!proposal) {
    proposal = await proposalDatasource.create(proposalWithNewStatus);
  }
  // Get Instrument
  for (const proposalInstrument of proposalWithNewStatus.instruments) {
    let instrument = await instrumentDataSource.get(proposalInstrument.id);

    if (!instrument) {
      instrument = await instrumentDataSource.create({
        id: proposalInstrument.id,
        name: proposalInstrument.shortCode,
      });
    }
    // Assign Instrument to Proposal and create an Experiment
    await experimentDataSource.create({
      proposalPk: proposal.id,
      instrumentId: instrument.id,
    });
  }

  const proposersAndCoproposers = [
    ...(proposalWithNewStatus.proposer ? [proposalWithNewStatus.proposer] : []),
    ...proposalWithNewStatus.members,
  ];
  // // Create new user for the proposer
  // if (proposalWithNewStatus.proposer) {
  //   await createUserAndAssignToExperiment(
  //     proposalWithNewStatus.proposer,
  //     proposalWithNewStatus.proposalPk
  //   );
  // }

  // Create new user for the co-proposer
  // const members = proposalWithNewStatus.members;
  for (const member of proposersAndCoproposers) {
    console.log('-=======members===========');
    console.log({ member });
    await createUserAndAssignToExperiment(
      member,
      proposalWithNewStatus.proposalPk
    );
  }

  // Delete the users that are saved in the experiment users table, but not in the Proposal Payload
  await deleteMissingUsersFromExperiment(
    proposalWithNewStatus.proposalPk,
    proposersAndCoproposers
  );
}
