export enum IdentityType {
  ESSSCIENCEUSER = 'ESSSCIENCEUSER',
  EMPLOYEEDK = 'EMPLOYEEDK',
}

export type UID_Person = string;

export interface Person {
  CCC_EmployeeSubType: IdentityType;
  CentralAccount: string;
  InternalName: string;
  UID_Person: UID_Person;
}
