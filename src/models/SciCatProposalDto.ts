export type CreateProposalDto = {
  ownerGroup: string;
  accessGroups: string[];
  proposalId: string;
  pi_email: string;
  pi_firstname: string;
  pi_lastname: string;
  email: string;
  firstname: string;
  lastname: string;
  title: string;
  abstract: string;
  startTime?: Date;
  endTime?: Date;
  MeasurementPeriodList: any[];
};
