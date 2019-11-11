import { Context } from 'koa';
import * as Router from 'koa-router';
import * as koaBody from 'koa-body';

const randomatic = require('randomatic');

import { sendResponse, sendError } from '../senders';
import { auth } from '../middlewares';
import config from '../config';
import Profile, { userEditableFields, adminEditableFields } from '../datasource/profiles.mongo';
import Email from '../datasource/email';
import * as utils from '../utils';
import { isAdmin } from '../middlewares/roles';

const defaultProjection = { password: 0, _id: 0 };

const router = new Router({
  prefix: '/profiles',
});

router.get('/', auth, async (ctx: Context) => {
  sendResponse(ctx, 200, { todo: 'implement' })
});

const extractProfileParams = (ctx: Context) => ({
  email: ctx.request.body.email,
  login: ctx.request.body.login,
  name: ctx.request.body.name,
  roles: ctx.request.body.roles || config.availableRoles.user,
  surname: ctx.request.body.surname,
});

const generatePassword = (): string => {
  return randomatic('*', 32);
};

router.use(koaBody());

router.post('/', auth, async (ctx: Context) => {
  const params = extractProfileParams(ctx);
  const password = generatePassword();

  const profile = new Profile({
    ...params,
    password: utils.auth.generateHashedPassword(password),
  });

  const result = await profile.save();

  await Email.create({
    to: result.email,
    topic: 'password',
    params: {
      password,
    },
  });

  sendResponse(ctx, 201, result);
});

router.get('/:id', auth, async (ctx: Context) => {
  const id = ctx.params.id;

  const profile = await Profile.findOne({ id }, defaultProjection);

  if (!profile) {
    return sendError(ctx, 404, { message: 'Profile not found' });
  }

  sendResponse(ctx, 200, profile);
});

type params = {
  [key: string]: any
}

const extractEditableFields = (ctx: Context): params => {
  let fields = userEditableFields;

  if (isAdmin(ctx.user)) {
    fields = adminEditableFields
  }

  return Object.keys(ctx.request.body || {}).reduce((acc: params, key: string): params => {
    if (fields.includes(key)) {
      acc[key] = ctx.request.body[key];
    }
    return acc;
  }, {});
};

router.patch('/:id', auth, async (ctx: Context) => {
  const id = ctx.params.id;

  const fields = extractEditableFields(ctx);

  await Profile.updateOne({ id }, { $set: fields });

  const profile = await Profile.findOne({ id }, defaultProjection);

  sendResponse(ctx, 200, profile || {});
});

type emailUpdate = {
  email: string
  confirmationPassword: string
}

type passwordUpdate = {
  password: string
  confirmationPassword: string
}

const extractEmailParams = (ctx: Context): emailUpdate => ({
  email: ctx.request.body.email || '',
  confirmationPassword: ctx.request.body.confirmationPassword || '',
})

router.put('/:id/email', auth, async (ctx: Context) => {
  const id = ctx.params.id;
  const params = extractEmailParams(ctx);

  let profile = await Profile.findOne({ id });

  if (!profile) {
    return sendError(ctx, 404, { message: 'Profile not found' });
  }

  if (!utils.auth.verifyHashedPassword(params.confirmationPassword, profile.password)) {
    return sendError(ctx, 403, { message: 'Forbidden' });
  }

  await profile.update({ $set: { email: params.email }});

  sendResponse(ctx, 200, { email: params.email });
});

const extractPasswordParams = (ctx: Context): passwordUpdate => ({
  password: ctx.request.body.password || '',
  confirmationPassword: ctx.request.body.confirmationPassword || '',
})

router.put('/:id/password', auth, async (ctx: Context) => {
  const id = ctx.params.id;
  const params = extractPasswordParams(ctx);

  let profile = await Profile.findOne({ id });

  if (!profile) {
    return sendError(ctx, 404, { message: 'Profile not found' });
  }

  if (!utils.auth.verifyHashedPassword(params.confirmationPassword, profile.password)) {
    return sendError(ctx, 403, { message: 'Forbidden' });
  }

  const password = utils.auth.generateHashedPassword(params.password);

  await profile.update({ $set: { password }});

  sendResponse(ctx, 204);
});

export default router;
