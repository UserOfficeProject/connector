import { UOExperimentDto } from '../../../../../services/userOfficeApi/type/uoExperiment.type';
import {
  CreateScicatProposalDto,
  MdEntry,
  MdEntryValue,
  UpdateScicatProposalDto,
} from '../type/scicatProposal.type';
import { metadataEntry } from '../utils/common';

const sciCatUsername = process.env.SCICAT_USERNAME;

const buildMetadata = (experiment: UOExperimentDto): MdEntry => {
  const { proposal, instrument, visit } = experiment;
  const registrations = visit?.registrations ?? [];

  const rows: [string, MdEntryValue][] = [
    metadataEntry(
      'status_proposal',
      'UOS Proposal Status',
      proposal.status.name
    ),
    metadataEntry(
      'status_experiment',
      'UOS Experiment Status',
      experiment.status
    ),
    metadataEntry('instrument_name', 'Instrument Name', instrument.name),
    metadataEntry(
      'number_of_visitors',
      'Number of Visitors',
      registrations.length
    ),
  ];

  registrations.forEach((registration, index) => {
    if (!registration.user) return;
    const i = index + 1;
    rows.push(
      metadataEntry(
        `visitor_${i}_firstname`,
        `Visitor ${i} First Name`,
        registration.user.firstname
      ),
      metadataEntry(
        `visitor_${i}_lastname`,
        `Visitor ${i} Last Name`,
        registration.user.lastname
      ),
      metadataEntry(
        `visitor_${i}_email`,
        `Visitor ${i} Email`,
        registration.user.email
      ),
      metadataEntry(
        `visitor_${i}_orcid`,
        `Visitor ${i} ORCID`,
        registration.user.oidcSub
      )
    );
  });

  return Object.fromEntries(rows);
};

export const getCreateScicatExperimentDto = (
  experiment: UOExperimentDto,
  instrumentIds: string[]
): CreateScicatProposalDto => {
  const { proposal, experimentId } = experiment;
  const { proposer } = proposal;

  return {
    type: 'Experiment',
    proposalId: experimentId,
    parentProposalId: proposal.proposalId,
    title: `${proposal.title} - ${experimentId}`,
    abstract: `Experiment ${experimentId}\n${proposal.abstract}`,
    firstname: proposer.firstname,
    lastname: proposer.lastname,
    email: proposer.email,
    pi_firstname: proposer.firstname,
    pi_lastname: proposer.lastname,
    pi_email: proposer.email,
    instrumentIds,
    ownerGroup: sciCatUsername || '',
    accessGroups: [experimentId],
    startTime: new Date(experiment.startsAt),
    endTime: new Date(experiment.endsAt),
    MeasurementPeriodList: [],
    metadata: buildMetadata(experiment),
  };
};

export const getUpdateScicatExperimentDto = (
  experiment: UOExperimentDto,
  instrumentIds: string[]
): UpdateScicatProposalDto => {
  const { proposal, experimentId } = experiment;
  const { proposer } = proposal;

  return {
    type: 'Experiment',
    parentProposalId: proposal.proposalId,
    title: `${proposal.title} - ${experimentId}`,
    abstract: `Experiment ${experimentId}\n${proposal.abstract}`,
    firstname: proposer.firstname,
    lastname: proposer.lastname,
    email: proposer.email,
    pi_firstname: proposer.firstname,
    pi_lastname: proposer.lastname,
    pi_email: proposer.email,
    instrumentIds,
    ownerGroup: sciCatUsername,
    accessGroups: [experimentId],
    startTime: new Date(experiment.startsAt),
    endTime: new Date(experiment.endsAt),
    MeasurementPeriodList: [],
    metadata: buildMetadata(experiment),
  };
};
