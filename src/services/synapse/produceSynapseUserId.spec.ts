const serverName = (process.env.SYNAPSE_SERVER_NAME = 'test-server');

import { produceSynapseUserId } from './produceSynapseUserId';

const member = {
  id: 1,
  email: 'john.doe@example.com',
  firstName: 'John',
  lastName: 'Doe',
  oidcSub: 'test-1234',
  oauthIssuer: 'keycloack',
};

test('Should produce valid user id with prefix', async () => {
  const result = await produceSynapseUserId(member, undefined, false);
  expect(result).toBe(`@${member.oidcSub}:${serverName}`);
});

test('Should produce valid user id without prefix', async () => {
  const result = await produceSynapseUserId(member, undefined, true);
  expect(result).toBe(`${member.oidcSub}`);
});

test('Should produce valid user id with special characters', async () => {
  const memberWithSpecialCharsInOidcSub = {
    ...member,
    oidcSub: 'SomeSpecialCharsà',
  };
  const expectedOidcSub = 'somespecialcharsa';

  const result = await produceSynapseUserId(memberWithSpecialCharsInOidcSub);

  expect(result).toBe(`@${expectedOidcSub}:${serverName}`);
});
