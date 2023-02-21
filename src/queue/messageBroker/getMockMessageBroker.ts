import {
  ConsumerCallback,
  MessageBroker,
  Queue,
} from '@user-office-software/duo-message-broker';

import { GetMessageBroker } from './getMessageBroker';

let mockMessageBroker: MockMessageBroker | undefined;

const getMockMqMessageBroker: GetMessageBroker = async () => {
  if (mockMessageBroker) {
    return mockMessageBroker;
  }
  mockMessageBroker = new MockMessageBroker();

  return mockMessageBroker;
};

class MockMessageBroker implements MessageBroker {
  sendMessage(queue: Queue, type: string, message: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
  sendBroadcast(queue: Queue, type: string, message: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
  listenOn(queue: Queue, cb: ConsumerCallback): void {
    throw new Error('Method not implemented.');
  }
  listenOnBroadcast(cb: ConsumerCallback): void {
    throw new Error('Method not implemented.');
  }
}

export default getMockMqMessageBroker;
