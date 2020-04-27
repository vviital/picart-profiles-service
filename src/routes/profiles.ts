import { Context } from 'koa';
import * as Router from 'koa-router';
import * as koaBody from 'koa-body';
import {get, includes, toString} from 'lodash';

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
  const fieldsToSearch = ['email', 'name', 'surname'];
  const options = {
    query: toString(ctx.query['query']),
    limit: +ctx.query['limit'] || 100,
    offset: +ctx.query['offset'] || 0
  };

  const regex = new RegExp(options.query.split('').map((s) => `.*${s}`).join(''), 'gmi');

  const profiles = await Profile
    .find({
      $or: fieldsToSearch.map((field) => ({[field]: {$regex: regex}}))
    }, defaultProjection)
    .skip(options.offset)
    .limit(options.limit);
  sendResponse(ctx, 200, {
    items: profiles.map(x => x.toJSON({ virtuals: true })),
    limit: options.limit,
    offset: options.offset,
    totalCount: profiles.length,
    type: 'collection',
  });
});

const extractProfileParams = (ctx: Context) => ({
  about: ctx.request.body.about,
  email: ctx.request.body.email,
  name: ctx.request.body.name,
  organization: ctx.request.body.organization,
  roles: ctx.request.body.roles || config.availableRoles.user,
  surname: ctx.request.body.surname,
  title: ctx.request.body.title,
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

  sendResponse(ctx, 201, result.toJSON({ virtuals: true }));
});

router.get('/:id', auth, async (ctx: Context) => {
  const id = ctx.params.id;

  const profile = await Profile.findOne({ id }, defaultProjection);

  if (!profile) {
    return sendError(ctx, 404, { message: 'Profile not found' });
  }

  sendResponse(ctx, 200, profile.toJSON({ virtuals: true }));
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

  if (profile) {
    return sendResponse(ctx, 200, profile.toJSON({ virtuals: true }));
  }

  sendResponse(ctx, 200, {});
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

router.delete('/:id', auth, async (ctx: Context) => {
  const roles: [string] = get(ctx, 'user.roles', []);
  if (!includes(roles, 'admin')) {
    return sendError(ctx, 403, { message: 'Forbidden' });
  }

  const id = ctx.params.id;
  const profile = await Profile.findOne({ id });

  if (!profile) {
    return sendError(ctx, 404, { message: 'Profile not found' });
  }
  await profile.remove();

  sendResponse(ctx, 204);
});

export default router;
