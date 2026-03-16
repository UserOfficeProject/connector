jest.mock('@user-office-software/duo-logger');

import { logger } from '@user-office-software/duo-logger';
import { MessageBroker } from '@user-office-software/duo-message-broker';

import { QueueConsumer } from './QueueConsumer';

class TestQueueConsumer extends QueueConsumer {
  getQueueName() {
    return 'testQueue';
  }

  getExchangeName() {
    return 'testExchange';
  }

  onMessage = jest.fn();
}

describe('QueueConsumer', () => {
  let messageBrokerMock: jest.Mocked<MessageBroker>;
  let queueConsumer: TestQueueConsumer;

  beforeEach(() => {
    messageBrokerMock = {
      addQueueToExchangeBinding: jest.fn().mockResolvedValue(undefined),
      listenOn: jest.fn().mockResolvedValue(undefined),
    } as any;
    queueConsumer = new TestQueueConsumer(messageBrokerMock);
  });

  it('should throw error if queue name is not set', async () => {
    queueConsumer.getQueueName = jest.fn();

    await expect(queueConsumer.start()).rejects.toThrow(
      `Queue name variable not set for consumer ${queueConsumer.constructor.name}`
    );
  });

  it('should throw error if exchange name is not set', async () => {
    queueConsumer.getExchangeName = jest.fn();

    await expect(queueConsumer.start()).rejects.toThrow(
      `Exchange name variable not set for consumer ${queueConsumer.constructor.name}`
    );
  });

  it('should call addQueueToExchangeBinding on start', async () => {
    await queueConsumer.start();

    expect(messageBrokerMock.addQueueToExchangeBinding).toHaveBeenCalledWith(
      'testQueue',
      'testExchange'
    );
  });

  it('should call listenOn on start', async () => {
    await queueConsumer.start();

    expect(messageBrokerMock.listenOn).toHaveBeenCalledWith(
      'testQueue',
      expect.any(Function)
    );
  });

  it('should call onMessage when a message is received', async () => {
    await queueConsumer.start();

    await messageBrokerMock.listenOn.mock.calls[0][1](
      'testMessage',
      {},
      {} as any
    );

    expect(logger.logInfo).toHaveBeenCalledWith('Received message on queue', {
      queueName: 'testQueue',
    });
    expect(logger.logException).not.toHaveBeenCalled();
    expect(queueConsumer.onMessage).toHaveBeenCalledWith('testMessage', {}, {});
  });

  it('should log error if onMessage throws and rethrow the error', async () => {
    const error = new Error('Test error');
    queueConsumer.onMessage = jest.fn().mockRejectedValue(error);

    await queueConsumer.start();

    await expect(
      messageBrokerMock.listenOn.mock.calls[0][1]('testMessage', {}, {} as any)
    ).rejects.toThrow(error);

    expect(logger.logInfo).toHaveBeenCalledWith('Received message on queue', {
      queueName: 'testQueue',
    });
    expect(logger.logException).toHaveBeenCalledWith(
      'Error while handling QueueConsumer callback: ',
      {
        error: error.message,
        queue: 'testQueue',
        consumer: 'TestQueueConsumer',
        args: ['testMessage', {}, {}],
      }
    );
  });
});
