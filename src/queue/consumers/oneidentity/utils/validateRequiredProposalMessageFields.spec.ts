import { validateRequiredProposalMessageFields } from './validateRequiredProposalMessageFields';

describe('validateRequiredProposalMessageFields', () => {
  it('should throw an error if message is not an object', () => {
    const message = 'not an object';

    expect(() => validateRequiredProposalMessageFields(message)).toThrow(
      'Invalid proposal message'
    );
  });

  it('should throw an error if message is null', () => {
    const message = null;

    expect(() => validateRequiredProposalMessageFields(message)).toThrow(
      'Invalid proposal message'
    );
  });

  it('should throw an error if shortCode is undefined', () => {
    const message = {
      proposer: {},
      members: [],
    };

    expect(() => validateRequiredProposalMessageFields(message)).toThrow(
      'Invalid proposal message'
    );
  });

  it('should throw an error if proposer is undefined', () => {
    const message = {
      shortCode: 'shortCode',
      members: [],
    };

    expect(() => validateRequiredProposalMessageFields(message)).toThrow(
      'Invalid proposal message'
    );
  });

  it('should throw an error if members is undefined', () => {
    const message = {
      shortCode: 'shortCode',
      proposer: {},
    };

    expect(() => validateRequiredProposalMessageFields(message)).toThrow(
      'Invalid proposal message'
    );
  });

  it('should return the message if shortCode, proposer, and members are defined', () => {
    const message = {
      shortCode: 'shortCode',
      proposer: {},
      members: [],
    };

    expect(validateRequiredProposalMessageFields(message)).toEqual(message);
  });
});
