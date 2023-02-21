import { NicosMessageData } from '../../../../models/KafkaTypes';

export type ValidNicosMessage = Required<NicosMessageData>;

export const validateNicosMessage = (messageVal: NicosMessageData) => {
  if (!messageVal.proposal || typeof messageVal.proposal !== 'string') {
    throw new Error('Proposal format is wrong');
  }

  if (!messageVal.instrument || typeof messageVal.instrument !== 'string') {
    throw new Error('Instrument format is wrong');
  }

  if (!messageVal.source || typeof messageVal.source !== 'string') {
    throw new Error('Source format is wrong');
  }

  if (!messageVal.message || typeof messageVal.message !== 'string') {
    throw new Error('message format is wrong');
  }

  return messageVal as ValidNicosMessage;
};
