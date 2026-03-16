import { collectUsersFromProposalMessage } from './collectUsersFromProposalMessage';
import { ProposalMessageData } from '../../../models/ProposalMessage';
import { ProposalUser } from '../scicat/scicatProposal/dto';

describe('collectUsersFromProposalMessage', () => {
  const createUser = (id: number, suffix: string): ProposalUser => ({
    id,
    firstName: `first-${suffix}`,
    lastName: `last-${suffix}`,
    email: `${suffix}@example.com`,
    oidcSub: `oidc-${suffix}`,
  });

  const createBaseMessage = (
    overrides: Partial<ProposalMessageData> = {}
  ): ProposalMessageData => ({
    proposalPk: 1,
    shortCode: 'short',
    title: 'title',
    abstract: 'abstract',
    callId: 2,
    submitted: true,
    members: [],
    ...overrides,
  });

  it('returns members, proposer, data access users, and visitors in order', () => {
    const member = createUser(1, 'member');
    const proposer = createUser(2, 'proposer');
    const dataAccessUser = createUser(3, 'data');
    const visitor = createUser(4, 'visitor');

    const message = createBaseMessage({
      members: [member],
      proposer,
      dataAccessUsers: [dataAccessUser],
      visitors: [visitor],
    });

    const result = collectUsersFromProposalMessage(message);

    expect(result).toEqual([member, proposer, dataAccessUser, visitor]);
  });

  it('filters out undefined entries', () => {
    const member = createUser(1, 'member');

    const message = createBaseMessage({
      members: [member],
      proposer: undefined,
      dataAccessUsers: [undefined as unknown as ProposalUser],
    });

    const result = collectUsersFromProposalMessage(message);

    expect(result).toEqual([member]);
  });

  it('handles missing dataAccessUsers by treating it as empty', () => {
    const member = createUser(1, 'member');
    const proposer = createUser(2, 'proposer');

    const message = {
      ...createBaseMessage({
        members: [member],
        proposer,
      }),
    } as ProposalMessageData;

    const result = collectUsersFromProposalMessage(message);

    expect(result).toEqual([member, proposer]);
  });

  it('handles missing visitors by treating it as empty', () => {
    const member = createUser(1, 'member');
    const proposer = createUser(2, 'proposer');

    const message = {
      ...createBaseMessage({
        members: [member],
        proposer,
        dataAccessUsers: [],
      }),
    } as ProposalMessageData;

    const result = collectUsersFromProposalMessage(message);

    expect(result).toEqual([member, proposer]);
  });
});
