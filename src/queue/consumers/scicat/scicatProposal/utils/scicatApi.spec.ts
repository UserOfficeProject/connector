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
