import { cleanEnv, str, bool, port } from 'envalid';

function validateEnv() {
  cleanEnv(process.env, {
    RABBITMQ_HOSTNAME: str(),
    RABBITMQ_USERNAME: str(),
    RABBITMQ_PASSWORD: str(),
    // NOTE: All variables are optional except RabbitMQ connection ones.
    KAFKA_CLIENTID: str({ default: undefined }),
    KAFKA_BROKERS: str({ default: undefined }),
    KAFKA_TOPIC: str({ default: undefined }),
    SCICAT_BASE_URL: str({ default: undefined }),
    SCICAT_LOGIN_ENDPOINT: str({ default: undefined }),
    SCICAT_USERNAME: str({ default: undefined }),
    SCICAT_PASSWORD: str({ default: undefined }),
    GRAYLOG_SERVER: str({ default: 'it-graylog.esss.lu.se' }),
    GRAYLOG_PORT: port({ default: 12201 }),
    SCICAT_PROPOSAL_TRIGGERING_STATUSES: str({ default: undefined }),
    PROPOSAL_FOLDERS_CREATION_GROUP_PREFIX: str({ default: '' }),
    PROPOSAL_FOLDERS_CREATION_COMMAND: str({ default: undefined }),
    PROPOSAL_FOLDERS_CREATION_TRIGGERING_STATUSES: str({ default: undefined }),
    ENABLE_SCICAT_PROPOSAL_UPSERT: bool({ default: false }),
    ENABLE_SCICHAT_ROOM_CREATION: bool({ default: false }),
    ENABLE_NICOS_TO_SCICHAT_MESSAGES: bool({ default: false }),
    ENABLE_PROPOSAL_FOLDERS_CREATION: bool({ default: false }),
    ENABLE_MOODLE_FOLDERS_CREATION: bool({ default: false }),
    ENABLE_ONE_IDENTITY_INTEGRATION: bool({ default: false }),
    PROPOSAL_CREATION_QUEUE_NAME: str({ default: undefined }),
    CHATROOM_CREATION_QUEUE_NAME: str({ default: undefined }),
    FOLDER_CREATION_QUEUE_NAME: str({ default: undefined }),
    MOODLE_EXCHANGE_NAME: str({ default: undefined }),
    MOODLE_FOLDER_CREATION_QUEUE_NAME: str({ default: undefined }),
    ONE_IDENTITY_PROPOSAL_IDENT_ESET_TYPE: str({ default: undefined }),
    ONE_IDENTITY_APP_SERVER_URL: str({ default: undefined }),
    ONE_IDENTITY_API_USER: str({ default: undefined }),
    ONE_IDENTITY_API_PASSWORD: str({ default: undefined }),
    USER_OFFICE_CORE_EXCHANGE_NAME: str({ default: undefined }),
    VISA_QUEUE_NAME: str({ default: undefined }),
    VISA_SYNCING_TRIGGERING_STATUSES: str({ default: undefined }),
    VISA_DATABASE_URL: str({ default: undefined }),
  });
}

export default validateEnv;
