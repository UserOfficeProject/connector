import { Instrument } from '../../../models/Visa';
import { InstrumentDataSource } from '../InstrumentDataSource';

export default class MockInstrumentDataSource implements InstrumentDataSource {
  async get(id: number): Promise<Instrument> {
    return { id, name: 'test', shortCode: 'test' };
  }

  async getByShortCode(code: string): Promise<Instrument> {
    return { id: 1, name: code, shortCode: 'test' };
  }

  async create(instrument: Instrument): Promise<Instrument> {
    return instrument;
  }

  async update(instrument: Instrument): Promise<Instrument> {
    return instrument;
  }
  async delete(id: number): Promise<number> {
    return id;
  }
}
