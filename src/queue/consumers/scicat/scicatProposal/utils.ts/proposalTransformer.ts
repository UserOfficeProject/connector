import { UOProposal } from '../../userOfficeApi/dto/proposal.dto';
import { CreateProposalDto, UpdateProposalDto } from '../dto';

interface MdEntryValue {
  human_name: string;
  value: string | number | boolean | null | undefined;
}

const metadataEntry = (
  key: string,
  human_name: string,
  value: string | number | boolean | null | undefined
): [string, MdEntryValue] => [key, { human_name, value }];

const buildMetadata = (proposal: UOProposal): Record<string, MdEntryValue> => {
  const {
    proposer,
    users = [],
    dataAccessUsers = [],
    instruments = [],
    call,
    status,
  } = proposal;

  const rows: [string, MdEntryValue][] = [
    metadataEntry('status', 'UOS Status', status.name),
    metadataEntry('pi_firstname', 'PI First Name', proposer.firstname),
    metadataEntry('pi_lastname', 'PI Last Name', proposer.lastname),
    metadataEntry('pi_email', 'PI Email', proposer.email),
    metadataEntry('pi_orcid', 'PI ORCID', proposer.oidcSub),
    metadataEntry('number_of_co_pis', 'Number of CoPIs', users.length),
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
        `co_pi_${i}_firstname`,
        `CoPI ${i} First Name`,
        user.firstname
      ),
      metadataEntry(
        `co_pi_${i}_lastname`,
        `CoPI ${i} Last Name`,
        user.lastname
      ),
      metadataEntry(`co_pi_${i}_email`, `CoPI ${i} Email`, user.email),
      metadataEntry(`co_pi_${i}_orcid`, `CoPI ${i} ORCID`, user.oidcSub),
      metadataEntry(
        `co_pi_${i}_affiliation`,
        `CoPI ${i} Affiliation`,
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
        ic.firstname
      ),
      metadataEntry(
        `instrument_${i}_contact_lastname`,
        `Instrument ${i} Contact Last Name`,
        ic.lastname
      )
    );
  });

  return Object.fromEntries(rows);
};

export const getCreateProposalDto = (
  proposal: UOProposal,
  instrumentIds: string[]
): CreateProposalDto => {
  const { proposer } = proposal;

  return {
    proposalId: proposal.proposalId,
    title: proposal.title,
    abstract: proposal.abstract,
    firstname: proposer.firstname,
    lastname: proposer.lastname,
    email: proposer.email,
    pi_firstname: proposer.firstname,
    pi_lastname: proposer.lastname,
    pi_email: proposer.email,
    instrumentIds,
    ownerGroup: proposal.proposalId,
    accessGroups: [],
    startTime: new Date(proposal.call.startCall),
    endTime: new Date(proposal.call.endCall),
    MeasurementPeriodList: [],
    metadata: buildMetadata(proposal),
  };
};

export const getUpdateProposalDto = (
  proposal: UOProposal,
  instrumentIds: string[]
): UpdateProposalDto => {
  const { proposer } = proposal;

  return {
    title: proposal.title,
    abstract: proposal.abstract,
    firstname: proposer.firstname,
    lastname: proposer.lastname,
    email: proposer.email,
    pi_firstname: proposer.firstname,
    pi_lastname: proposer.lastname,
    pi_email: proposer.email,
    instrumentIds,
    ownerGroup: proposal.proposalId,
    accessGroups: [],
    startTime: new Date(proposal.call.startCall),
    endTime: new Date(proposal.call.endCall),
    MeasurementPeriodList: [],
    metadata: buildMetadata(proposal),
  };
};
