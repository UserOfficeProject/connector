import database from './database';
import { ExperimentUser, User } from '../../../models/Visa';
import { ExperimentUserDataSource } from '../ExperimentUserDataSource';
import {
  ExperimentUserRecord,
  UserRecord,
  createExperimentUserObject,
  createUserObject,
} from '../records';

export default class PostgresExperimentUserDataSource
  implements ExperimentUserDataSource
{
  private TABLE_NAME = 'experiment_user';

  async create({
    experimentId,
    userId,
  }: {
    experimentId: string;
    userId: string;
  }): Promise<ExperimentUser> {
    const experimentUserExists = await database(this.TABLE_NAME).where({
      experiment_id: experimentId,
      user_id: userId,
    });
    console.log({ experimentUserExists });
    if (experimentUserExists.length > 0) {
      return experimentUserExists[0];
    }

    return await database(this.TABLE_NAME)
      .insert({
        experiment_id: experimentId,
        user_id: userId,
      })
      .returning(['*'])
      .then((experimentUser: ExperimentUserRecord[]) => {
        console.log('%%%%%%%%%%%%%%%');

        return createExperimentUserObject(experimentUser[0]);
      })
      .catch((e) => {
        console.log({ e });
      });
  }

  async delete({
    experimentId,
    userId,
  }: {
    experimentId: string;
    userId: string;
  }): Promise<number> {
    return await database(this.TABLE_NAME)
      .where({
        experiment_id: experimentId,
        user_id: userId,
      })
      .del();
  }

  async getAllUsersByExperimentId(experimentId: string): Promise<User[]> {
    return await database(this.TABLE_NAME)
      .join('users', 'users.id', '=', this.TABLE_NAME + '.user_id')
      .where({
        experiment_id: experimentId,
      })
      .select('users.*')
      .then((users: UserRecord[]) => {
        return users.map((user) => {
          return createUserObject(user);
        });
      });
  }
}
