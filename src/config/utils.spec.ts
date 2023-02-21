import { str2Bool } from './utils';

test('Should able to create boolean config', () => {
  expect(str2Bool('true')).toBe(true);
  expect(str2Bool('True')).toBe(true);
  expect(str2Bool('1')).toBe(true);
  expect(str2Bool('false')).toBe(false);
  expect(str2Bool('False')).toBe(false);
  expect(str2Bool('0')).toBe(false);
  expect(str2Bool('othervalue')).toBe(false);
  expect(str2Bool('10')).toBe(false);
});
