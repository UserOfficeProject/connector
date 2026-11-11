import { MdEntryValue } from '../type/scicatProposal.type';

export const metadataEntry = (
  key: string,
  human_name: string,
  value: string | number | boolean | null | undefined,
  isScientificMetadata?: boolean
): [string, MdEntryValue] => [
  key,
  {
    ...(human_name ? { human_name } : {}),
    value,
    ...(isScientificMetadata !== undefined
      ? { is_scientific_metadata: isScientificMetadata }
      : {}),
  },
];
