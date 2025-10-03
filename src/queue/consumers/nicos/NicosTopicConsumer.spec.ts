jest.mock('tsyringe', () => ({
  container: {
    resolve: jest.fn(),
  },
}));
jest.mock('./utils/validateNicosMessage');
jest.mock('@user-office-software/duo-logger', () => ({
  logger: {
    logError: jest.fn(),
  },
}));

import { logger } from '@user-office-software/duo-logger';
import { container } from 'tsyringe';

import { TopicSciChatConsumer } from './NicosTopicConsumer';
import { validateNicosMessage } from './utils/validateNicosMessage';
import { Tokens } from '../../../config/Tokens';

const mockLogin = jest.fn();
const mockSendMessage = jest.fn();

const mockSynapseService = {
  login: mockLogin,
  sendMessage: mockSendMessage,
};

const mockConsume = jest.fn();

const mockConsumerService = {
  consume: mockConsume,
};

describe('TopicSciChatConsumer', () => {
  const topic = 'test-topic';
  const kafkaClientId = 'test-client-id';
  const validMessageData = {
    proposal: 'p1',
    instrument: 'testInstrument',
    source: 'test-source',
    message: 'hello',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (container.resolve as jest.Mock).mockReturnValue(mockSynapseService);
    (validateNicosMessage as jest.Mock).mockReturnValue(validMessageData);
    process.env.KAFKA_CLIENTID = kafkaClientId;
  });

  it('should login and consume messages', async () => {
    const consumer = new TopicSciChatConsumer(mockConsumerService as any);

    await consumer.start(topic);

    expect(container.resolve).toHaveBeenCalledWith(Tokens.SynapseService);
    expect(mockLogin).toHaveBeenCalledWith('TopicSciChatConsumer');
    expect(mockConsume).toHaveBeenCalledWith(
      kafkaClientId,
      { topics: [topic] },
      expect.objectContaining({
        eachMessage: expect.any(Function),
      })
    );
  });

  it('should process a valid message and call sendMessage', async () => {
    const consumer = new TopicSciChatConsumer(mockConsumerService as any);
    await consumer.start(topic);

    // Simulate eachMessage handler
    const { eachMessage } = mockConsume.mock.calls[0][2];
    const fakeKafkaMessage = {
      value: Buffer.from(JSON.stringify(validMessageData)),
      offset: '123',
    };

    await eachMessage({ message: fakeKafkaMessage });

    expect(validateNicosMessage).toHaveBeenCalledWith(validMessageData);
    expect(mockSendMessage).toHaveBeenCalledWith('p1', 'hello');
    expect(logger.logError).not.toHaveBeenCalled();
  });

  it('should log error and not throw if message processing fails', async () => {
    const consumer = new TopicSciChatConsumer(mockConsumerService as any);
    await consumer.start(topic);

    // Simulate eachMessage handler with invalid JSON
    const { eachMessage } = mockConsume.mock.calls[0][2];
    const fakeKafkaMessage = {
      value: Buffer.from('not-json'),
      offset: '456',
    };

    await eachMessage({ message: fakeKafkaMessage });

    expect(logger.logError).toHaveBeenCalledWith('Failed processing message', {
      messageOffset: '456',
      reason: expect.any(String),
    });
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it('should log error if validateNicosMessage throws', async () => {
    (validateNicosMessage as jest.Mock).mockImplementation(() => {
      throw new Error('validation failed');
    });

    const consumer = new TopicSciChatConsumer(mockConsumerService as any);
    await consumer.start(topic);

    const { eachMessage } = mockConsume.mock.calls[0][2];
    const fakeKafkaMessage = {
      value: Buffer.from(JSON.stringify(validMessageData)),
      offset: '789',
    };

    await eachMessage({ message: fakeKafkaMessage });

    expect(logger.logError).toHaveBeenCalledWith('Failed processing message', {
      messageOffset: '789',
      reason: 'validation failed',
    });
    expect(mockSendMessage).not.toHaveBeenCalled();
  });
});
