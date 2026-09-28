import { fetchUoProposal, fetchUoExperiment } from './uoApi';

const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockProposal = {
  proposalId: '158548',
  title: 'Test Proposal',
};

const mockExperiment = {
  experimentId: '158548-3',
};

beforeEach(() => {
  jest.clearAllMocks();
  process.env.USER_OFFICE_GRAPHQL_URL = 'http://localhost:8080/graphql';
  process.env.USER_OFFICE_JWT = 'test-token';
});

describe('fetchUoProposal', () => {
  it('returns proposal data on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { proposal: mockProposal } }),
    });

    const result = await fetchUoProposal(1);

    expect(result).toEqual(mockProposal);
  });

  it('throws when response is not ok', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      text: async () => 'Internal Server Error',
    });

    await expect(fetchUoProposal(1)).rejects.toThrow(
      'UOS GraphQL request failed: Internal Server Error'
    );
  });

  it('throws when response contains GraphQL errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        errors: [{ message: 'Not found' }],
      }),
    });

    await expect(fetchUoProposal(1)).rejects.toThrow('UOS GraphQL errors');
  });
});

describe('fetchUoExperiment', () => {
  it('returns experiment data on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { experiment: mockExperiment } }),
    });

    const result = await fetchUoExperiment(311);

    expect(result).toEqual(mockExperiment);
  });

  it('throws when response is not ok', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      text: async () => 'Internal Server Error',
    });

    await expect(fetchUoExperiment(311)).rejects.toThrow(
      'UOS GraphQL request failed: Internal Server Error'
    );
  });
});
