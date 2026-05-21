import { createHash } from 'crypto';

import {
  UOExperimentDto,
  UOExperimentSafetySample,
} from '../../../../../services/userOfficeApi/type/uoExperiment.type';
import {
  CreateScicatProposalDto,
  CreateScicatSampleDto,
  MdEntry,
  MdEntryValue,
  UpdateScicatProposalDto,
  UpdateScicatSampleDto,
} from '../type/scicatProposal.type';
import { metadataEntry } from '../utils/common';
import { scicatApi } from '../utils/scicatApi';

// ──────────────────────────────────────────────────────────────────────────────
// ── Experiment ────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────
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
    ownerGroup: scicatApi.username || '',
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
    ownerGroup: scicatApi.username,
    accessGroups: [experimentId],
    startTime: new Date(experiment.startsAt),
    endTime: new Date(experiment.endsAt),
    MeasurementPeriodList: [],
    metadata: buildMetadata(experiment),
  };
};

// ──────────────────────────────────────────────────────────────────────────────
// ── Sample ────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────

const buildSampleHash = (dto: CreateScicatSampleDto): string => {
  const hashableData = {
    accessGroups: dto.accessGroups,
    description: dto.description,
    isPublished: dto.isPublished,
    ownerGroup: dto.ownerGroup,
    proposalId: dto.proposalId,
    sampleCharacteristics: dto.sampleCharacteristics,
  };

  return createHash('md5').update(JSON.stringify(hashableData)).digest('hex');
};

const buildSampleCharacteristics = (
  sample: UOExperimentSafetySample,
  experiment: UOExperimentDto
): Record<string, MdEntryValue> => {
  const fields = sample.questionary.steps
    .flatMap((step) => step.fields)
    .filter((f) => f.question.id !== 'sample_esi_basis' && f.value !== null);

  const rows: [string, MdEntryValue][] = [
    metadataEntry('uos_sample_id', 'UOS Sample ID', sample.sampleId),
    metadataEntry(
      'uos_sample_lookup',
      'UOS Sample Lookup',
      `${experiment.experimentId}_${sample.sampleId}`
    ),
    metadataEntry(
      'questionary_length',
      'Number of questions in Questionary',
      fields.length
    ),
    ...fields.map((field) =>
      metadataEntry(
        field.question.id,
        field.question.question,
        JSON.stringify(field.value)
      )
    ),
  ];

  return Object.fromEntries(rows);
};

export const getCreateScicatSampleDto = (
  sample: UOExperimentSafetySample,
  experiment: UOExperimentDto
): CreateScicatSampleDto => {
  const sampleCharacteristics = buildSampleCharacteristics(sample, experiment);
  const dto = {
    ownerGroup: scicatApi.username || '',
    type: 'Sample Information',
    accessGroups: [experiment.experimentId],
    proposalId: experiment.experimentId,
    description: sample.sample.title, //TODO: this should be replaced with sampleName before merge
    isPublished: false,
    sampleCharacteristics,
  };
  dto.sampleCharacteristics['sample_hash'] = {
    human_name: 'Sample Hash',
    value: buildSampleHash(dto),
  };

  return dto;
};

export const getUpdateScicatSampleDto = (
  sample: UOExperimentSafetySample,
  experiment: UOExperimentDto
): UpdateScicatSampleDto => {
  const sampleCharacteristics = buildSampleCharacteristics(sample, experiment);
  const dto = {
    ownerGroup: scicatApi.username || '',
    accessGroups: [experiment.experimentId],
    proposalId: experiment.experimentId,
    description: sample.sample.title, //TODO: this should be replaced with sampleName before merge
    isPublished: false,
    sampleCharacteristics,
  };
  dto.sampleCharacteristics['sample_hash'] = {
    human_name: 'Sample Hash',
    value: buildSampleHash(dto),
  };

  return dto;
};
