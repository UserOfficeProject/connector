import 'reflect-metadata';

switch (process.env.DEPENDENCY_CONFIG) {
  case 'test':
    require('./dependencyConfigTest');
    break;
  default:
    require('./dependencyConfigRun');
}
