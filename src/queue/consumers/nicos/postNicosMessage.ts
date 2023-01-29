import Matrix from 'matrix-js-sdk';

const serverUrl =
  process.env.SYNAPSE_SERVER_NAME ?? 'https://server-scichat.swap.ess.eu';
const serverName = process.env.SYNAPSE_SERVER_NAME ?? 'ess';
const serviceAccount = {
  userId: process.env.SYNAPSE_SERVICE_USER ?? '@scichatbot:ess',
  accessToken:
    process.env.SYNAPSE_SERVICE_TOKEN ??
    'syt_c2NpY2hhdGJvdA_zdoVzeGmXOWMCNGTnVfX_2SmyIi',
};
const connectToChatroom = async () => {
  const client = Matrix.createClient({
    baseUrl: serverUrl,
    userId: serviceAccount.userId,
    accessToken: serviceAccount.accessToken,
  });

  await client.startClient();

  try {
    const room = await client.getRoom('hello');
  } catch (err) {}
};

export { connectToChatroom };
