import { str2Bool } from './utils';

test('Should able to create boolean config', () => {
  expect(str2Bool('true')).toBe(true);
  expect(str2Bool('t')).toBe(true);
  expect(str2Bool('1')).toBe(true);
  expect(str2Bool('false')).toBe(false);
  expect(str2Bool('f')).toBe(false);
  expect(str2Bool('0')).toBe(false);
  expect(str2Bool('othervalue')).toBe(false);
});
