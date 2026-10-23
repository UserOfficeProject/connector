import database from './database';
import PostgresUserDataSource from './UserDataSource';
import { ProposalUser } from '../../../queue/consumers/scicat/scicatProposal/dto';
import { createUserObject, UserRecord } from '../records';

jest.mock('./database', () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe('PostgresUserDataSource', () => {
  it('creates a VISA user without looking up or assigning roles', async () => {
    const proposalUser = {
      oidcSub: 'user-id',
      email: 'user@example.com',
      firstName: 'Test',
      lastName: 'User',
      institution: { id: 1, name: 'Institution' },
    } as ProposalUser;
    const userRecord: UserRecord = {
      id: 'user-id',
      email: 'user@example.com',
      first_name: 'Test',
      last_name: 'User',
      affiliation_id: 1,
      instance_quota: '1',
      activated_at: '',
      last_seen_at: '',
    };
    const returning = jest.fn().mockResolvedValue([userRecord]);
    const insert = jest.fn().mockReturnValue({ returning });
    const userQuery = {
      where: jest.fn().mockReturnValue({
        first: jest.fn().mockResolvedValue(undefined),
      }),
      insert,
    };
    const employerQuery = {
      where: jest.fn().mockReturnValue({
        first: jest.fn().mockResolvedValue({
          id: 1,
          name: 'Institution',
          country_code: '',
          town: '',
        }),
      }),
    };
    const mockedDatabase = database as unknown as jest.Mock;
    mockedDatabase.mockImplementation((tableName: string) => {
      if (tableName === 'users') return userQuery;
      if (tableName === 'employer') return employerQuery;

      throw new Error(`Unexpected table access: ${tableName}`);
    });

    const result = await new PostgresUserDataSource().create(proposalUser);

    expect(result).toEqual(createUserObject(userRecord));
    expect(insert).toHaveBeenCalledWith({
      id: 'user-id',
      email: 'user@example.com',
      first_name: 'Test',
      last_name: 'User',
      instance_quota: 1,
      affiliation_id: 1,
    });
    expect(mockedDatabase.mock.calls).toEqual([
      ['users'],
      ['employer'],
      ['users'],
    ]);
  });
});
