import { validateProposalMessage } from './validateProposalMessage';

describe('validateProposalMessage', () => {
  it('should throw an error if message is not an object', () => {
    const message = 'not an object';

    expect(() => validateProposalMessage(message)).toThrow(
      'Invalid proposal message'
    );
  });

  it('should throw an error if message is null', () => {
    const message = null;

    expect(() => validateProposalMessage(message)).toThrow(
      'Invalid proposal message'
    );
  });

  it('should throw an error if shortCode is undefined', () => {
    const message = {
      proposer: {},
      members: [],
    };

    expect(() => validateProposalMessage(message)).toThrow(
      'Invalid proposal message'
    );
  });

  it('should throw an error if proposer is undefined', () => {
    const message = {
      shortCode: 'shortCode',
      members: [],
    };

    expect(() => validateProposalMessage(message)).toThrow(
      'Invalid proposal message'
    );
  });

  it('should throw an error if members is undefined', () => {
    const message = {
      shortCode: 'shortCode',
      proposer: {},
    };

    expect(() => validateProposalMessage(message)).toThrow(
      'Invalid proposal message'
    );
  });

  it('should return the message if shortCode, proposer, and members are defined', () => {
    const message = {
      shortCode: 'shortCode',
      proposer: {},
      members: [],
    };

    expect(validateProposalMessage(message)).toEqual(message);
  });
});
