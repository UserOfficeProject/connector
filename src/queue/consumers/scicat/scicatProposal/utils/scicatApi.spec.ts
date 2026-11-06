describe('ScicatApi', () => {
  it('should initialize with correct serviceUsername', () => {
    process.env.ENABLE_SCICAT_PROPOSAL_UPSERT = 'true';
    process.env.ENABLE_SCICAT_EXPERIMENT_UPSERT = 'true';
    process.env.SCICAT_BASE_URL = 'http://localhost:3000';
    process.env.SCICAT_JWT =
      'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VybmFtZSI6InRlc3R1c2VyIn0.signature';

    jest.isolateModules(() => {
      const { scicatApi } = require('./scicatApi');
      expect(scicatApi.serviceUsername).toBe('testuser');
    });

    delete process.env.SCICAT_BASE_URL;
    delete process.env.SCICAT_JWT;
  });

  it('should throw if SCICAT_JWT is not defined', () => {
    process.env.SCICAT_BASE_URL = 'http://localhost:3000';

    jest.isolateModules(() => {
      expect(() => require('./scicatApi')).toThrow('SCICAT_JWT is not defined');
    });

    delete process.env.SCICAT_BASE_URL;
  });
});

describe('ScicatApi metadata on update', () => {
  const originalFetch = global.fetch;
  let existingMetadata: Record<string, unknown> | null;
  let fetchMock: jest.Mock;

  const visitor = (firstname: string) => ({
    status: 'DRAFTED',
    user: {
      id: 7,
      firstname,
      lastname: 'Last',
      email: `${firstname}@example.com`,
      oidcSub: `${firstname}-sub`,
      institution: 'ESS',
    },
  });

  const person = (firstname: string) => visitor(firstname).user;

  const uoExperiment = (registrations: ReturnType<typeof visitor>[]) =>
    ({
      experimentId: '158548-3',
      startsAt: '2026-10-02T07:00:00.000Z',
      endsAt: '2026-10-03T07:00:00.000Z',
      status: 'ACTIVE',
      instrument: { id: 1, name: 'YMIR', shortCode: 'ymir' },
      proposal: {
        proposalId: '158548',
        title: 'Test Proposal',
        abstract: 'Test Abstract',
        status: { id: 'ALLOCATED', name: 'ALLOCATED' },
        proposer: person('John'),
      },
      visit: { registrations },
      localContact: null,
    }) as any;

  const uoProposal = (users: ReturnType<typeof person>[]) =>
    ({
      proposalId: '158548',
      title: 'Test Proposal',
      abstract: 'Test Abstract',
      status: { id: 'ALLOCATED', name: 'ALLOCATED' },
      proposer: person('John'),
      users,
      dataAccessUsers: [],
      instruments: [],
      call: {
        id: 1,
        shortCode: 'CALL-2025',
        isActive: true,
        startCall: '2025-01-01T00:00:00.000Z',
        endCall: '2025-12-31T00:00:00.000Z',
      },
    }) as any;

  const loadScicatApi = () => {
    let api: any;
    jest.isolateModules(() => {
      api = require('./scicatApi').scicatApi;
    });

    return api;
  };

  const requests = (method: string) =>
    fetchMock.mock.calls.filter(
      ([, config]) => (config?.method ?? 'GET') === method
    );

  const patchedMetadata = () => {
    const [[, config]] = requests('PATCH');

    return JSON.parse(config.body).metadata;
  };

  beforeEach(() => {
    process.env.ENABLE_SCICAT_PROPOSAL_UPSERT = 'true';
    process.env.ENABLE_SCICAT_EXPERIMENT_UPSERT = 'true';
    process.env.SCICAT_BASE_URL = 'http://localhost:3000';
    process.env.SCICAT_JWT =
      'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VybmFtZSI6InRlc3R1c2VyIn0.signature';

    existingMetadata = {};
    fetchMock = jest.fn(async (url: string) => {
      const body = url.includes('/Instruments')
        ? [{ pid: 'scicat-inst-1' }]
        : { proposalId: 'id', metadata: existingMetadata };

      return { ok: true, status: 200, text: async () => JSON.stringify(body) };
    });
    global.fetch = fetchMock as any;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.SCICAT_BASE_URL;
    delete process.env.SCICAT_JWT;
  });

  describe('updateExperiment', () => {
    it('keeps embargo_end_date and published_data_doi', async () => {
      existingMetadata = {
        embargo_end_date: {
          human_name: 'Embargo end date',
          value: '2029-10-03T07:00:00.000Z',
        },
        published_data_doi: {
          human_name: 'Published Data DOI',
          value: '10.5072/abc',
        },
      };

      await loadScicatApi().updateExperiment(uoExperiment([]));

      expect(patchedMetadata()).toMatchObject(existingMetadata);
    });

    it('does not keep any other existing metadata', async () => {
      existingMetadata = {
        visitor_1_firstname: { value: 'Old1' },
        visitor_2_firstname: { value: 'Old2' },
        other_key: { value: 'other' },
        embargo_end_date: { value: '2029-10-03T07:00:00.000Z' },
      };

      await loadScicatApi().updateExperiment(uoExperiment([visitor('New1')]));

      const metadata = patchedMetadata();
      expect(metadata.visitor_1_firstname.value).toBe('New1');
      expect(metadata).not.toHaveProperty('visitor_2_firstname');
      expect(metadata).not.toHaveProperty('other_key');
      expect(metadata).toHaveProperty('embargo_end_date');
      expect(metadata).not.toHaveProperty('published_data_doi');
    });

    it('overwrites the fields the connector builds', async () => {
      existingMetadata = {
        status_experiment: {
          human_name: 'UOS Experiment Status',
          value: 'DRAFT',
        },
      };

      await loadScicatApi().updateExperiment(uoExperiment([]));

      expect(patchedMetadata().status_experiment).toEqual({
        human_name: 'UOS Experiment Status',
        value: 'ACTIVE',
      });
    });

    it('sends the built metadata when the record has none', async () => {
      existingMetadata = null;

      await loadScicatApi().updateExperiment(uoExperiment([]));

      expect(patchedMetadata().status_experiment.value).toBe('ACTIVE');
    });

    it('does not update when the current metadata cannot be read', async () => {
      fetchMock.mockImplementation(async (url: string) =>
        url.includes('/Instruments')
          ? { ok: true, status: 200, text: async () => '[{"pid":"i"}]' }
          : { ok: false, status: 500, text: async () => 'SciCat is down' }
      );

      await expect(
        loadScicatApi().updateExperiment(uoExperiment([]))
      ).rejects.toThrow('SciCat is down');
      expect(requests('PATCH')).toHaveLength(0);
    });
  });

  describe('updateProposal', () => {
    it('keeps published_data_doi and embargo_end_date', async () => {
      existingMetadata = {
        published_data_doi: { value: '10.5072/abc' },
        embargo_end_date: { value: '2029-10-03T07:00:00.000Z' },
        status: { human_name: 'UOS Proposal Status', value: 'DRAFT' },
      };

      await loadScicatApi().updateProposal(uoProposal([]));

      const metadata = patchedMetadata();
      expect(metadata.published_data_doi).toEqual({ value: '10.5072/abc' });
      expect(metadata.embargo_end_date).toEqual({
        value: '2029-10-03T07:00:00.000Z',
      });
      expect(metadata.status.value).toBe('ALLOCATED');
    });

    it('does not keep any other existing metadata', async () => {
      existingMetadata = {
        co_i_1_firstname: { value: 'Old1' },
        co_i_2_firstname: { value: 'Old2' },
        other_key: { value: 'other' },
      };

      await loadScicatApi().updateProposal(uoProposal([person('New1')]));

      const metadata = patchedMetadata();
      expect(metadata.co_i_1_firstname.value).toBe('New1');
      expect(metadata).not.toHaveProperty('co_i_2_firstname');
      expect(metadata).not.toHaveProperty('other_key');
    });
  });
});
