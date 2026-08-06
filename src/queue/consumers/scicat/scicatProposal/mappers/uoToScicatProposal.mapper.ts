import { UOProposalDto } from '../../../../../services/userOfficeApi/type/uoProposal.type';
import {
  CreateScicatProposalDto,
  MdEntry,
  MdEntryValue,
  UpdateScicatProposalDto,
} from '../type/scicatProposal.type';
import { metadataEntry } from '../utils/common';

const buildMetadata = (proposal: UOProposalDto): MdEntry => {
  const {
    proposer,
    users = [],
    dataAccessUsers = [],
    instruments = [],
    call,
    status,
  } = proposal;

  const rows: [string, MdEntryValue][] = [
    metadataEntry('status', 'UOS Proposal Status', status.name),
    metadataEntry('pi_firstname', 'PI First Name', proposer.firstname),
    metadataEntry('pi_lastname', 'PI Last Name', proposer.lastname),
    metadataEntry('pi_email', 'PI Email', proposer.email),
    metadataEntry('pi_orcid', 'PI ORCID', proposer.oidcSub),
    metadataEntry('number_of_co_is', 'Number of CoIs', users.length),
    metadataEntry(
      'number_of_dau',
      'Number of Data Access Users',
      dataAccessUsers.length
    ),
    metadataEntry('call_name', 'Call', call.shortCode),
    metadataEntry('call_id', 'Call Id', call.id),
    metadataEntry('start_call', 'Call Start Date', call.startCall),
    metadataEntry('end_call', 'Call End Date', call.endCall),
    metadataEntry(
      'number_of_instruments',
      'Number of Instruments',
      instruments.length
    ),
  ];

  // Co-PIs
  users.forEach((user, index) => {
    const i = index + 1;
    rows.push(
      metadataEntry(
        `co_i_${i}_firstname`,
        `CoI ${i} First Name`,
        user.firstname
      ),
      metadataEntry(`co_i_${i}_lastname`, `CoI ${i} Last Name`, user.lastname),
      metadataEntry(`co_i_${i}_email`, `CoI ${i} Email`, user.email),
      metadataEntry(`co_i_${i}_orcid`, `CoI ${i} ORCID`, user.oidcSub),
      metadataEntry(
        `co_i_${i}_affiliation`,
        `CoI ${i} Affiliation`,
        user.institution
      )
    );
  });

  // Data Access Users
  dataAccessUsers.forEach((dau, index) => {
    const i = index + 1;
    rows.push(
      metadataEntry(
        `dau_${i}_firstname`,
        `Data Access User ${i} First Name`,
        dau.firstname
      ),
      metadataEntry(
        `dau_${i}_lastname`,
        `Data Access User ${i} Last Name`,
        dau.lastname
      ),
      metadataEntry(`dau_${i}_email`, `Data Access User ${i} Email`, dau.email),
      metadataEntry(
        `dau_${i}_orcid`,
        `Data Access User ${i} ORCID`,
        dau.oidcSub
      )
    );
  });

  // Instruments
  instruments.forEach((inst, index) => {
    const i = index + 1;
    const ic = inst.instrumentContact;
    rows.push(
      metadataEntry(`instrument_${i}_name`, `Instrument ${i} Name`, inst.name),
      metadataEntry(`instrument_${i}_id`, `Instrument ${i} Id`, inst.id),
      metadataEntry(
        `instrument_${i}_contact_firstname`,
        `Instrument ${i} Contact First Name`,
        ic?.firstname || null
      ),
      metadataEntry(
        `instrument_${i}_contact_lastname`,
        `Instrument ${i} Contact Last Name`,
        ic?.lastname || null
      )
    );
  });

  return Object.fromEntries(rows);
};

export const getCreateScicatProposalDto = (
  proposal: UOProposalDto,
  instrumentIds: string[]
): CreateScicatProposalDto => {
  const { proposer } = proposal;

  return {
    type: 'Proposal',
    proposalId: proposal.proposalId,
    title: proposal.title,
    abstract: proposal.abstract,
    firstname: proposer.firstname,
    lastname: proposer.lastname,
    email: proposer.email,
    pi_firstname: proposer.firstname,
    pi_lastname: proposer.lastname,
    pi_email: proposer.email,
    pi_affiliation: proposer.institution,
    instrumentIds,
    ownerGroup: proposal.proposalId,
    accessGroups: [],
    startTime: new Date(proposal.call.startCall),
    endTime: new Date(proposal.call.endCall),
    MeasurementPeriodList: [],
    metadata: buildMetadata(proposal),
  };
};

export const getUpdateScicatProposalDto = (
  proposal: UOProposalDto,
  instrumentIds: string[]
): UpdateScicatProposalDto => {
  const { proposer } = proposal;

  return {
    type: 'Proposal',
    title: proposal.title,
    abstract: proposal.abstract,
    firstname: proposer.firstname,
    lastname: proposer.lastname,
    email: proposer.email,
    pi_firstname: proposer.firstname,
    pi_lastname: proposer.lastname,
    pi_email: proposer.email,
    pi_affiliation: proposer.institution,
    instrumentIds,
    ownerGroup: proposal.proposalId,
    accessGroups: [],
    startTime: new Date(proposal.call.startCall),
    endTime: new Date(proposal.call.endCall),
    MeasurementPeriodList: [],
    metadata: buildMetadata(proposal),
  };
};
