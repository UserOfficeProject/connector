import { validateProposalMessage } from './validateMessages';

describe('Validate messages', () => {
  it('should throw error when message is not valid', () => {
    expect(() =>
      validateProposalMessage({ message: 'message' } as any)
    ).toThrow();
  });

  it('should not throw error when message is valid', () => {
    expect(() =>
      validateProposalMessage({
        title: 'Test proposal',
        abstract: 'Test abstract',
        members: [],
        proposalPk: 1,
        shortCode: '123123',
        instrument: { id: 1, shortCode: 'TEST' },
        newStatus: 'REVIEW',
        proposer: {
          id: 1,
          firstName: 'Test',
          lastName: 'User',
          email: 'test.user@email.com',
          oidcSub: 'testOidcSub',
        },
      })
    ).not.toThrow();
  });
});
