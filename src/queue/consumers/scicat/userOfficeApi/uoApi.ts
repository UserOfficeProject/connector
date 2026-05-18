import { UOProposal } from './dto/proposal.dto';
import { GET_EXPERIMENT_QUERY } from './queries/getExperiment.query';
import { GET_PROPOSAL_QUERY } from './queries/getProposal.query';

const uosGraphqlUrl = process.env.USER_OFFICE_GRAPHQL_URL;
const uosToken = process.env.USER_OFFICE_JWT;

const graphqlRequest = async <TResponse>(
  query: string,
  variables: Record<string, unknown>
): Promise<TResponse> => {
  if (!uosGraphqlUrl) {
    throw new Error('USER_OFFICE_GRAPHQL_URL is not defined');
  }

  if (!uosToken) {
    throw new Error('USER_OFFICE_JWT is not defined');
  }

  const response = await fetch(uosGraphqlUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${uosToken}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`UOS GraphQL request failed: ${detail}`);
  }

  const json = await response.json();

  if (json.errors?.length) {
    throw new Error(`UOS GraphQL errors: ${JSON.stringify(json.errors)}`);
  }

  return json as TResponse;
};

export const fetchUoProposal = async (primaryKey: number) => {
  const { data } = await graphqlRequest<{ data: { proposal: UOProposal } }>(
    GET_PROPOSAL_QUERY,
    { primaryKey }
  );

  return data.proposal;
};

export const fetchUoExperiment = async (experimentPk: number) => {
  const { data } = await graphqlRequest<{ data: { experiment: unknown } }>(
    GET_EXPERIMENT_QUERY,
    { experimentPk }
  );

  return data.experiment;
};
