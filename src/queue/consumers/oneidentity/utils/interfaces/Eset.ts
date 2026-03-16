import { UID_ESetType } from './EsetType';

export type UID_ESet = string;

export interface Eset {
  UID_ESet: UID_ESet;
  UID_ESetType: UID_ESetType;
  Ident_ESet: string;
  DisplayName: string;
}
