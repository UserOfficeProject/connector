import LocalDB from './local';
import RemoteDB from './remote';

const database = process.env.NODE_ENV == 'local' ? LocalDB : RemoteDB;

export default database;
