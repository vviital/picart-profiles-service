import { Context } from 'koa';
import * as Router from 'koa-router';
import * as koaBody from 'koa-body';
import * as jwt from 'jsonwebtoken';

import { sendResponse, sendError } from '../senders';
import Profiles from '../datasource/profiles.mongo';
import { auth } from '../utils'
import { UserClaims } from '../models';
import config from '../config';

const router = new Router({
  prefix: '/tokens',
});

type tokenParameters = {
  value: string,
  password: string
}

const extractTokenParameters = (ctx: Context): tokenParameters => ({
  value: ctx.request.body.value || '',
  password: ctx.request.body.password || '',
});
 
// TODO: add some params validator
router.post('/', koaBody({ json: true }), async (ctx: Context) => {
  const params = extractTokenParameters(ctx);

  const profile = await Profiles.findOne({
    email: params.value,
  });

  if (!profile) {
    return sendError(ctx, 404, { message: 'Profile not found' });
  }

  if (!auth.verifyHashedPassword(params.password, profile.password)) {
    return sendError(ctx, 401, { message: 'Unauthorized' })
  }

  const claims: UserClaims = ({
    id: profile.id,
    email: profile.email,
    roles: profile.roles,
  });

  const token = jwt.sign(claims, config.tokenSecret, { expiresIn: '7d' });
 
  sendResponse(ctx, 200, { token });
});

export default router;
