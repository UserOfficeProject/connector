import { produceSynapseUserId } from './produceSynapseUserId';

test('Should produce valid user id', () => {
  const member = {
    id: 1,
    email: 'john.doe@example.com',
    firstName: 'John',
    lastName: 'Doe',
    oidcSub: '1234',
    oauthIssuer: 'https://keycloak.com',
  };
  const result = produceSynapseUserId(member);
  expect(result).toBe('@1234:serverName');
});
