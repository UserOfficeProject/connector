import { cleanEnv, str, bool } from 'envalid';

function validateEnv() {
  cleanEnv(process.env, {
    RABBITMQ_HOSTNAME: str(),
    RABBITMQ_USERNAME: str(),
    RABBITMQ_PASSWORD: str(),
    KAFKA_CLIENTID: str(),
    KAFKA_BROKERS: str(),
    SCICAT_BASE_URL: str(),
    SCICAT_LOGIN_ENDPOINT: str(),
    SCICAT_USERNAME: str(),
    SCICAT_PASSWORD: str(),
    SCICAT_PROPOSAL_TRIGGERING_STATUSES: str(),
    PROPOSAL_FOLDERS_CREATION_COMMAND: str(),
    PROPOSAL_FOLDERS_CREATION_TRIGGERING_STATUSES: str(),
    USER_OFFICE_GRAPHQL_URL: bool(),
    USER_OFFICE_JWT: bool(),
    ENABLE_SCICAT_PROPOSAL_UPSERT: bool(),
    ENABLE_SCICHAT_ROOM_CREATION: bool(),
    ENABLE_NICOS_TO_SCICHAT_MESSAGES: bool(),
    ENABLE_PROPOSAL_FOLDERS_CREATION: bool(),
  });
}

export default validateEnv;
