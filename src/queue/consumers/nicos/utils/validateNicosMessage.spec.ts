import { validateNicosMessage } from './validateNicosMessage';
import { NicosMessageData } from '../../../../models/KafkaTypes';
// Mock NicosMessageData type since it's imported from another file

describe('validateNicosMessage', () => {
  const validMessage: NicosMessageData = {
    proposal: 'proposal1',
    instrument: 'instrument1',
    source: 'source1',
    message: 'message1',
  };

  it('should return the message as ValidNicosMessage when all fields are valid', () => {
    const result = validateNicosMessage(validMessage);
    expect(result).toEqual(validMessage);
  });

  it('should throw error if proposal is missing', () => {
    const msg = { ...validMessage, proposal: undefined };
    expect(() => validateNicosMessage(msg as any)).toThrow(
      'Proposal format is wrong'
    );
  });

  it('should throw error if proposal is not a string', () => {
    const msg = { ...validMessage, proposal: 123 as any };
    expect(() => validateNicosMessage(msg)).toThrow('Proposal format is wrong');
  });

  it('should throw error if instrument is missing', () => {
    const msg = { ...validMessage, instrument: undefined as any };
    expect(() => validateNicosMessage(msg)).toThrow(
      'Instrument format is wrong'
    );
  });

  it('should throw error if instrument is not a string', () => {
    const msg = { ...validMessage, instrument: 123 as any };
    expect(() => validateNicosMessage(msg)).toThrow(
      'Instrument format is wrong'
    );
  });

  it('should throw error if source is missing', () => {
    const msg = { ...validMessage, source: undefined as any };
    expect(() => validateNicosMessage(msg)).toThrow('Source format is wrong');
  });

  it('should throw error if source is not a string', () => {
    const msg = { ...validMessage, source: 123 as any };
    expect(() => validateNicosMessage(msg)).toThrow('Source format is wrong');
  });

  it('should throw error if message is missing', () => {
    const msg = { ...validMessage, message: undefined as any };
    expect(() => validateNicosMessage(msg)).toThrow('message format is wrong');
  });

  it('should throw error if message is not a string', () => {
    const msg = { ...validMessage, message: 123 as any };
    expect(() => validateNicosMessage(msg)).toThrow('message format is wrong');
  });
});
