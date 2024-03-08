import { isProposalMessageData } from './isProposalMessageData';

describe('isProposalMessageData', () => {
  it('should return true for valid ProposalMessageData', () => {
    const validMessage = {
      shortCode: '1234',
      proposer: { email: 'proposer' },
      members: [{ email: 'member1' }, { email: 'member2' }],
    };
    expect(isProposalMessageData(validMessage)).toBe(true);
  });

  it('should return false if shortCode is missing', () => {
    const messageWithoutShortCode = {
      members: [{ email: 'member1' }, { email: 'member2' }],
    };
    expect(isProposalMessageData(messageWithoutShortCode)).toBe(false);
  });

  it('should return false if members is missing', () => {
    const messageWithoutMembers = {
      shortCode: '1234',
    };
    expect(isProposalMessageData(messageWithoutMembers)).toBe(false);
  });

  it('should return false if proposer is missing', () => {
    const messageWithoutProposer = {
      shortCode: '1234',
      members: [{ email: 'member1' }, { email: 'member2' }],
    };
    expect(isProposalMessageData(messageWithoutProposer)).toBe(false);
  });

  it('should return false for an empty object', () => {
    const emptyMessage = {};
    expect(isProposalMessageData(emptyMessage)).toBe(false);
  });
});
