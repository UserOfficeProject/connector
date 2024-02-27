import { isProposalMessageData } from './isProposalMessageData';
import { ProposalUser } from '../../scicat/scicatProposal/dto';

describe('isProposalMessageData', () => {
  it('should return true for valid ProposalMessageData', () => {
    const validMessage = {
      shortCode: '1234',
      members: [
        { email: 'member1' } as ProposalUser,
        { email: 'member2' } as ProposalUser,
      ],
    };
    expect(isProposalMessageData(validMessage)).toBe(true);
  });

  it('should return false if shortCode is missing', () => {
    const messageWithoutShortCode = {
      members: [
        { email: 'member1' } as ProposalUser,
        { email: 'member2' } as ProposalUser,
      ],
    };
    expect(isProposalMessageData(messageWithoutShortCode)).toBe(false);
  });

  it('should return false if members is missing', () => {
    const messageWithoutMembers = {
      shortCode: '1234',
    };
    expect(isProposalMessageData(messageWithoutMembers)).toBe(false);
  });

  it('should return false for an empty object', () => {
    const emptyMessage = {};
    expect(isProposalMessageData(emptyMessage)).toBe(false);
  });
});
