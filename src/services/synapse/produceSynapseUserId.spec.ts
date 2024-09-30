import { produceSynapseUserId } from './produceSynapseUserId';
test('Should produce valid user id', async () => {
  const member = {
    id: 1,
    email: 'john.doe@example.com',
    firstName: 'John',
    lastName: 'Doe',
    oidcSub: '1234',
    oauthIssuer: 'keycloack',
  };
  const result = await produceSynapseUserId(member);
  expect(result).toBe('@1234:serverName');
});
