import {
  getCreateScicatProposalDto,
  getUpdateScicatProposalDto,
} from './uoToScicatProposal.mapper';
import { UOProposalDto } from '../../../../../services/userOfficeApi/type/uoProposal.type';

const createBaseUoProposal = (
  overrides: Partial<UOProposalDto> = {}
): UOProposalDto => ({
  proposalId: '158548',
  title: 'Test Proposal',
  abstract: 'Test Abstract',
  status: { id: 1, name: 'ALLOCATED' },
  proposer: {
    id: 1,
    firstname: 'John',
    lastname: 'Doe',
    email: 'john.doe@example.com',
    oidcSub: '0000-0001-2345-6789',
    institution: 'ESS',
  },
  users: [],
  dataAccessUsers: [],
  instruments: [],
  call: {
    id: 1,
    shortCode: 'CALL-2025',
    isActive: true,
    startCall: '2025-01-01T00:00:00.000Z',
    endCall: '2025-12-31T00:00:00.000Z',
  },
  ...overrides,
});

const instrumentIds = ['scicat-inst-1'];

describe('getCreateScicatProposalDto', () => {
  it('maps proposal to create DTO correctly', () => {
    expect(
      getCreateScicatProposalDto(createBaseUoProposal(), instrumentIds)
    ).toMatchSnapshot();
  });

  it('includes co-PI, DAU and instrument metadata when present', () => {
    expect(
      getCreateScicatProposalDto(
        createBaseUoProposal({
          users: [
            {
              id: 2,
              firstname: 'Jane',
              lastname: 'Smith',
              email: 'jane@example.com',
              oidcSub: '0000-0002-3456-7890',
              institution: 'ESS',
            },
          ],
          dataAccessUsers: [
            {
              id: 3,
              firstname: 'Bob',
              lastname: 'Jones',
              email: 'bob@example.com',
              oidcSub: '0000-0003-4567-8901',
              institution: 'ESS',
            },
            {
              id: 4,
              firstname: 'Alice',
              lastname: 'Johnson',
              email: 'alice@example.com',
              oidcSub: '0000-0004-5678-9012',
              institution: 'ESS',
            },
          ],
          instruments: [
            {
              id: 1,
              name: 'YMIR',
              shortCode: 'ymir',
              instrumentContact: {
                id: 7,
                firstname: 'Fredrik',
                lastname: 'Bolmsten',
              },
            },
          ],
        }),
        instrumentIds
      )
    ).toMatchSnapshot();
  });
});

describe('getUpdateScicatProposalDto', () => {
  it('maps proposal to update DTO correctly', () => {
    expect(
      getUpdateScicatProposalDto(createBaseUoProposal(), instrumentIds)
    ).toMatchSnapshot();
  });

  it('should not include proposalId', () => {
    const dto = getUpdateScicatProposalDto(
      createBaseUoProposal(),
      instrumentIds
    );

    expect((dto as any).proposalId).toBeUndefined();
  });
});
