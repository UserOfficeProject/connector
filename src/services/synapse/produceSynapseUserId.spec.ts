import { produceSynapseUserId } from './produceSynapseUserId';
import { SynapseService } from './SynapseService';
test('Should produce valid user id', () => {
  const synapseService = new SynapseService();

  const member = {
    id: 1,
    email: 'john.doe@example.com',
    firstName: 'John',
    lastName: 'Doe',
    oidcSub: '1234',
    oauthIssuer: 'https://keycloak.com',
  };
  const result = produceSynapseUserId(member, synapseService);
  expect(result).toBe('@1234:serverName');
});
