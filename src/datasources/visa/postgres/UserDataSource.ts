import database from './database';
import { Employer, User } from '../../../models/Visa';
import { ProposalUser } from '../../../queue/consumers/scicat/scicatProposal/dto';
import {
  EmployerRecord,
  UserRecord,
  createEmployerObject,
  createUserObject,
} from '../records';
import { UserDataSource, UserUpdationEventPayload } from '../UserDataSource';

export default class PostgresUserDataSource implements UserDataSource {
  private TABLE_NAME = 'users';
  private EMPLOYER_TABLE_NAME = 'employer';
  private USER_ROLE = 'user_role';
  private ROLE = 'role';

  async create(user: ProposalUser): Promise<User | null> {
    if (!user.email || !user.institution) return null;
    const userExists = await database(this.TABLE_NAME)
      .where({
        id: user.email,
      })
      .first()
      .then((user: UserRecord) => {
        return user ? createUserObject(user) : null;
      });
    console.log({ userExists });
    // Create an Employer, if it does not exist
    let employer: Employer;
    const employerExists = await database(this.EMPLOYER_TABLE_NAME)
      .where({
        id: user.institution.id,
      })
      .first()
      .then((employer: EmployerRecord) => {
        return employer ? createEmployerObject(employer) : null;
      });
    console.log({ employerExists });
    if (employerExists) {
      employer = employerExists;
    } else {
      employer = await database(this.EMPLOYER_TABLE_NAME)
        .insert({
          id: user.institution.id,
          name: user.institution.name,
          country_code: user.country?.country?.slice(0, 10) ?? '',
        })
        .returning(['*'])
        .then((employer: EmployerRecord[]) => {
          return createEmployerObject(employer[0]);
        });
    }
    if (userExists) {
      console.log('****************');
      // Update user table if the institution_id is different
      if (userExists.affiliationId !== employer.id) {
        return await database(this.TABLE_NAME)
          .where({
            email: user.email,
          })
          .update({
            affiliation_id: employer.id,
          })
          .returning('*')
          .then((user: UserRecord[]) => {
            return userExists;
          });
      } else {
        return userExists;
      }
    } else {
      // Insert into users table
      return await database(this.TABLE_NAME)
        .insert({
          id: user.email,
          email: user.email,
          first_name: user.firstName ?? '',
          last_name: user.lastName ?? '',
          instance_quota: 1,
          affiliation_id: employer.id,
        })
        .returning(['*'])
        .then(async (user: UserRecord[]) => {
          const scientificComputingRole = await database(this.ROLE)
            .where({
              name: 'SCIENTIFIC_COMPUTING',
            })
            .first();

          if (scientificComputingRole) {
            await database(this.USER_ROLE).insert({
              user_id: user[0].id,
              role_id: scientificComputingRole.id,
            });
          }

          return createUserObject(user[0]);
        });
    }
  }

  async update(user: UserUpdationEventPayload): Promise<User> {
    const userExists = await database(this.TABLE_NAME).where({
      email: user.email,
    });

    // Update only if the User exists and submitted
    if (userExists) {
      return await database(this.TABLE_NAME)
        .where({
          email: user.email,
        })
        .update({
          first_name: user.firstname ?? '',
          last_name: user.lastname ?? '',
        })
        .returning(['*'])
        .then((user: UserRecord[]) => {
          return createUserObject(user[0]);
        });
    } else return userExists;
  }

  async delete(id: number) {
    await database(this.TABLE_NAME)
      .where({
        id: id,
      })
      .delete()
      .returning(['*'])
      .then((user: UserRecord[]) => {
        return createUserObject(user[0]);
      });

    return id;
  }
}
