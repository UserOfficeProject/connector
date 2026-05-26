import 'reflect-metadata';
import dotenv from 'dotenv';

switch (process.env.NODE_ENV) {
  case 'test':
    dotenv.config({ path: './.env.tests', quiet: true });
    require('./dependencyConfigTest');
    break;
  default:
    dotenv.config({ path: './.env', quiet: true });
    require('./dependencyConfigRun');
}
