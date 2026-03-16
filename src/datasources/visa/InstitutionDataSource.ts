import { Employer } from '../../models/Visa';
export interface CountryPayload {
  countryId?: number;
  country?: string;
}
export interface InstitutionPayload {
  id: number;
  name: string;
  country?: number;
  verified: boolean;
  rorId?: string;
}
export interface InstitutionDataSource {
  create(
    institution: InstitutionPayload,
    country: CountryPayload
  ): Promise<Employer>;
}
