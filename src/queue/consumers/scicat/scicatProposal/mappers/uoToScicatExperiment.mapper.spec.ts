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
  localContact: {
    id: 8,
    firstname: 'Junjie',
    lastname: 'Quan',
    email: 'junjie.quan@ess.eu',
    oidcSub: 'junjiequan',
    institution: 'Other',
  },
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

  it('maps the proposer institution to the pi_affiliation metadata entry', () => {
    const dto = getCreateScicatExperimentDto(
      createBaseUoExperiment(),
      instrumentIds
    );

    expect(dto.metadata?.['pi_affiliation']).toEqual({
      human_name: 'PI Affiliation',
      value: 'ESS',
    });
  });

  it('leaves the pi_affiliation value undefined when the proposer has no institution', () => {
    const experiment = createBaseUoExperiment();
    delete experiment.proposal.proposer.institution;

    const dto = getCreateScicatExperimentDto(experiment, instrumentIds);

    expect(dto.metadata?.['pi_affiliation']).toEqual({
      human_name: 'PI Affiliation',
      value: undefined,
    });
  });

  it('maps the local contact to metadata entries', () => {
    const dto = getCreateScicatExperimentDto(
      createBaseUoExperiment(),
      instrumentIds
    );

    expect(dto.metadata?.['local_contact_firstname']).toEqual({
      human_name: 'Local contact name',
      value: 'Junjie',
    });
    expect(dto.metadata?.['local_contact_email']).toEqual({
      human_name: 'Local contact email',
      value: 'junjie.quan@ess.eu',
    });
  });

  it('falls back to null local contact entries when no local contact is assigned', () => {
    const dto = getCreateScicatExperimentDto(
      createBaseUoExperiment({ localContact: null }),
      instrumentIds
    );

    expect(dto.metadata?.['local_contact_firstname']).toEqual({
      human_name: 'Local contact name',
      value: null,
    });
  });

  describe('keywords from SCICAT_NEW_EXPERIMENT_KEYWORDS', () => {
    afterEach(() => {
      delete process.env.SCICAT_NEW_EXPERIMENT_KEYWORDS;
    });

    it('sets the configured keyword on the new experiment', () => {
      process.env.SCICAT_NEW_EXPERIMENT_KEYWORDS = 'WF_01_00';

      const dto = getCreateScicatExperimentDto(
        createBaseUoExperiment(),
        instrumentIds
      );

      expect(dto.keywords).toEqual(['WF_01_00']);
    });

    it('accepts a comma separated list and trims spaces', () => {
      process.env.SCICAT_NEW_EXPERIMENT_KEYWORDS = 'WF_01_00, WF_02_00 ,';

      const dto = getCreateScicatExperimentDto(
        createBaseUoExperiment(),
        instrumentIds
      );

      expect(dto.keywords).toEqual(['WF_01_00', 'WF_02_00']);
    });

    it('falls back to WF_01_00 when the setting is not set', () => {
      const dto = getCreateScicatExperimentDto(
        createBaseUoExperiment(),
        instrumentIds
      );

      expect(dto.keywords).toEqual(['WF_01_00']);
    });

    it('falls back to WF_01_00 when the setting is empty', () => {
      process.env.SCICAT_NEW_EXPERIMENT_KEYWORDS = ' ';

      const dto = getCreateScicatExperimentDto(
        createBaseUoExperiment(),
        instrumentIds
      );

      expect(dto.keywords).toEqual(['WF_01_00']);
    });
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

  it('maps the proposer institution to the pi_affiliation metadata entry', () => {
    const dto = getUpdateScicatExperimentDto(
      createBaseUoExperiment(),
      instrumentIds
    );

    expect(dto.metadata?.['pi_affiliation']).toEqual({
      human_name: 'PI Affiliation',
      value: 'ESS',
    });
  });

  it('does not send keywords, so the workflow keywords are kept', () => {
    process.env.SCICAT_NEW_EXPERIMENT_KEYWORDS = 'WF_01_00';

    const dto = getUpdateScicatExperimentDto(
      createBaseUoExperiment(),
      instrumentIds
    );

    expect((dto as any).keywords).toBeUndefined();
    delete process.env.SCICAT_NEW_EXPERIMENT_KEYWORDS;
  });

  it('should not include proposalId', () => {
    const dto = getUpdateScicatExperimentDto(
      createBaseUoExperiment(),
      instrumentIds
    );

    expect((dto as any).proposalId).toBeUndefined();
  });
});
