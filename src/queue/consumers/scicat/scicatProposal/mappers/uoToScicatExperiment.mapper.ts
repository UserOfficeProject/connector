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
  const { proposal, instrument, visit, localContact } = experiment;
  const { proposer } = proposal;
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
    metadataEntry('pi_firstname', 'PI First Name', proposer.firstname),
    metadataEntry('pi_lastname', 'PI Last Name', proposer.lastname),
    metadataEntry('pi_email', 'PI Email', proposer.email),
    metadataEntry('pi_orcid', 'PI ORCID', proposer.oidcSub),
    metadataEntry('pi_affiliation', 'PI Affiliation', proposer.institution),
    metadataEntry('instrument_name', 'Instrument Name', instrument.name),
    metadataEntry(
      'local_contact_firstname',
      'Local contact name',
      localContact?.firstname || null
    ),
    metadataEntry(
      'local_contact_lastname',
      'Local contact surname',
      localContact?.lastname || null
    ),
    metadataEntry(
      'local_contact_email',
      'Local contact email',
      localContact?.email || null
    ),
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
      ),
      metadataEntry(
        `visitor_${i}_affiliation`,
        `Visitor ${i} Affiliation`,
        registration.user.institution
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
    ownerGroup: scicatApi.serviceUsername || '',
    accessGroups: [proposal.proposalId],
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
    ownerGroup: scicatApi.serviceUsername,
    accessGroups: [proposal.proposalId],
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
    sampleName: dto.sampleName,
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
  const fields = sample.questionary.steps.flatMap((step) => step.fields);
  const sampleLookup = `${experiment.experimentId}-${sample.sampleId}`;

  const rows: [string, MdEntryValue][] = [
    metadataEntry('uos_sample_id', 'UOS Sample ID', sample.sampleId),
    metadataEntry('uos_sample_lookup', 'UOS Sample Lookup', sampleLookup),
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
    ownerGroup: scicatApi.serviceUsername || '',
    type: 'Sample Information',
    accessGroups: [experiment.proposal.proposalId],
    proposalId: experiment.experimentId,
    sampleName: sample.sample.title,
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
    ownerGroup: scicatApi.serviceUsername || '',
    accessGroups: [experiment.proposal.proposalId],
    proposalId: experiment.experimentId,
    sampleName: sample.sample.title,
    isPublished: false,
    sampleCharacteristics,
  };
  dto.sampleCharacteristics['sample_hash'] = {
    human_name: 'Sample Hash',
    value: buildSampleHash(dto),
  };

  return dto;
};
