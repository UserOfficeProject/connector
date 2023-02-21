import { cleanEnv, str } from 'envalid';

function validateEnv() {
  cleanEnv(process.env, {
    RABBITMQ_HOSTNAME: str(),
    RABBITMQ_USERNAME: str(),
    RABBITMQ_PASSWORD: str(),
    KAFKA_CLIENTID: str(),
    KAFKA_BROKERS: str(),
    KAFKA_TOPIC: str(),
    SCICAT_BASE_URL: str(),
    SCICAT_LOGIN_ENDPOINT: str(),
    SCICAT_USERNAME: str(),
    SCICAT_PASSWORD: str(),
    SCICAT_PROPOSAL_TRIGGERING_STATUSES: str(),
  });
}

export default validateEnv;
