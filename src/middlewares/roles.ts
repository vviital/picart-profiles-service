import { UserClaims } from '../models';

const isAdmin = (user: UserClaims) => user.roles.includes('admin');

const isUser = (user: UserClaims) => user.roles.includes('user');

export {
  isAdmin,
  isUser,
};
