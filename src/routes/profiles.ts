import { Context } from 'koa';
import * as Router from 'koa-router';
import * as koaBody from 'koa-body';

const randomatic = require('randomatic');

import { sendResponse } from '../senders';
import { auth } from '../middlewares';
import config from '../config';
import Profile from '../datasource/profiles.mongo';
import Email from '../datasource/email';
import * as utils from '../utils';

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

  sendResponse(ctx, 200, { todo: 'implement', id });
});

router.patch('/:id', auth, async (ctx: Context) => {
  const id = ctx.params.id;

  sendResponse(ctx, 200, { todo: 'implement', id });
});

router.put('/:id/email', auth, async (ctx: Context) => {
  const id = ctx.params.id;

  sendResponse(ctx, 200, { todo: 'implement', id });
});

router.put('/:id/password', auth, async (ctx: Context) => {
  const id = ctx.params.id;

  sendResponse(ctx, 200, { todo: 'implement', id });
});

export default router;
