import { Instrument } from '../../models/Visa';
export interface InstrumentCreationEventPayload {
  id: number;
  name: string;
}

export type InstrumentUpdationEventPayload = InstrumentCreationEventPayload;

export type InstrumentDeletionEventPayload = InstrumentCreationEventPayload;

export interface InstrumentDataSource {
  get(id: number): Promise<Instrument | null>;
  create(instrument: InstrumentCreationEventPayload): Promise<Instrument>;
  update(instrument: InstrumentUpdationEventPayload): Promise<Instrument>;
  delete(id: number): Promise<number>;
}
