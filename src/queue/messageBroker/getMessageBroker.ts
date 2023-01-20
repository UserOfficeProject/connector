import { MessageBroker } from '@user-office-software/duo-message-broker';

export type GetMessageBroker = () => Promise<MessageBroker>;
