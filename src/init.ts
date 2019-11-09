import { auth } from './utils';
import config from './config';
import Profile from './datasource/profiles.mongo';

type templateSuperAdmin = {
  email: string
  login: string
  name: string
  surname: string
  roles: string
}

const init = async () => {
  const template: templateSuperAdmin = require('./templates/superadmin.json');
  const user = {
    ...template,
    password: auth.generateHashedPassword(config.adminPassword),
  };

  const profile = new Profile(user);

  try {
    await profile.save();
  } catch (err) {
    // user does not exists and something bad happened.
    if (err.code != 11000) {
      console.error(err);
    }
  }

  console.log('Initialization has been completed');
};

export default init;
