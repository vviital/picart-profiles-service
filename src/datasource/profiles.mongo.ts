import * as mongoose from 'mongoose';
import * as shortID from 'shortid';

import config from '../config';

const profileDefinition = new mongoose.Schema({
  id: {
    type: String,
    unique: true,
    default: shortID,
  },
  __v: {
    type: Number,
    select: false,
  },
  email: {
    type: String,
    unique: true,
    required: true,
  },
  password: {
    value: {
      type: String,
      required: true,
    },
    salt: {
      type: String,
      required: true,
    },
  },
  name: {
    type: String,
    required: true,
  },
  surname: {
    type: String,
    required: true,
  },
  roles: {
    type: [String],
    default: config.availableRoles.user,
  },
  photo: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  about: {
    type: String,
  },
  organization: {
    type: String,
  },
  title: {
    type: String,
  },
});

profileDefinition.virtual('type').get(() => 'profile');
profileDefinition.index({ email: 1 }, { unique: true });

export interface IProfile extends mongoose.Document {
  about: string,
  createdAt: Date,
  email: string
  name: string
  organization: string,
  photo: string
  password: {
    value: string,
    salt: string,
  }
  roles: string[]
  surname: string
  title: string,
  updatedAt: Date,
}

const Profiles = mongoose.model<IProfile>('profiles', profileDefinition);

export const userEditableFields = [
  'about',
  'name',
  'organization',
  'photo',
  'surname',
  'title',
];

export const adminEditableFields = [
  ...userEditableFields,
  'roles',
];

export default Profiles;
