jest.mock('../utils/scicatApi', () => ({
  scicatApi: {
    serviceUsername: 'testuser',
  },
}));

import {
  getCreateScicatExperimentDto,
  getUpdateScicatExperimentDto,
} from './uoToScicatExperiment.mapper';
import { UOExperimentDto } from '../../../../../services/userOfficeApi/type/uoExperiment.type';

const createBaseUoExperiment = (
  overrides: Partial<UOExperimentDto> = {}
): UOExperimentDto => ({
  experimentId: '158548-3',
  startsAt: '2026-10-02T07:00:00.000Z',
  endsAt: '2026-10-03T07:00:00.000Z',
  status: 'ACTIVE',
  instrument: {
    id: 1,
    name: 'YMIR',
    shortCode: 'ymir',
  },
  proposal: {
    proposalId: '158548',
    title: 'Test Proposal',
    abstract: 'Test Abstract',
    status: { id: 'ALLOCATED', name: 'ALLOCATED' },
    proposer: {
      id: 1,
      firstname: 'John',
      lastname: 'Doe',
      email: 'john.doe@example.com',
      oidcSub: '0000-0001-2345-6789',
      institution: 'ESS',
    },
  },
  visit: null,
  ...overrides,
});

const instrumentIds = ['scicat-inst-1'];

describe('getCreateScicatExperimentDto', () => {
  it('maps experiment to create DTO correctly', () => {
    const dto = getCreateScicatExperimentDto(
      createBaseUoExperiment(),
      instrumentIds
    );

    expect(dto).toMatchSnapshot();
  });

  it('includes visitor entries when registrations are present', () => {
    const dto = getCreateScicatExperimentDto(
      createBaseUoExperiment({
        visit: {
          registrations: [
            {
              status: 'DRAFTED',
              user: {
                id: 7,
                firstname: 'testFirst',
                lastname: 'testLast',
                email: 'test@example.com',
                oidcSub: 'testOidcSub',
                institution: 'ESS',
              },
            },
          ],
        },
      }),
      instrumentIds
    );

    expect(dto).toMatchSnapshot();
  });

  it('skips visitor entries when user is null', () => {
    const dto = getCreateScicatExperimentDto(
      createBaseUoExperiment({
        visit: {
          registrations: [{ status: 'DRAFTED', user: null }],
        },
      }),
      instrumentIds
    );

    expect(dto.metadata?.['visitor_1_firstname']).toBeUndefined();
  });
});

describe('getUpdateScicatExperimentDto', () => {
  it('maps experiment to update DTO correctly', () => {
    const dto = getUpdateScicatExperimentDto(
      createBaseUoExperiment(),
      instrumentIds
    );

    expect(dto).toMatchSnapshot();
  });

  it('should not include proposalId', () => {
    const dto = getUpdateScicatExperimentDto(
      createBaseUoExperiment(),
      instrumentIds
    );

    expect((dto as any).proposalId).toBeUndefined();
  });
});
