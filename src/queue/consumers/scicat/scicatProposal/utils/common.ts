import { MdEntryValue } from '../type/scicatProposal.type';

export const metadataEntry = (
  key: string,
  human_name: string,
  value: string | number | boolean | null | undefined
): [string, MdEntryValue] => [
  key,
  human_name ? { human_name, value } : { value },
];
