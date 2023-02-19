import 'reflect-metadata';
import dotenv from 'dotenv';

console.log('Runningning');

switch (process.env.NODE_ENV) {
  case 'test':
    dotenv.config({ path: './.env.tests' });
    require('./dependencyConfigTest');
    break;
  default:
    dotenv.config({ path: './.env' });
    require('./dependencyConfigRun');
}
