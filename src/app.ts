import * as Koa from 'koa';
import * as mongoose from 'mongoose';

import * as logger from 'koa-logger';
import * as cors from '@koa/cors';

import config from './config';
import { profiles, tokens } from './routes';
import init from './init';

const createApp = async () => {
  const app = new Koa();
  app.use(cors());
  app.use(logger());

  app.use(profiles.routes());
  app.use(tokens.routes())

  await mongoose.connect(config.mongoURL, { useNewUrlParser: true });
  await init();

  const server = app.listen(config.port, () => {
    console.log('Profiles service started');
  });

  return {
    destroy: async () => {
      server.close();
      await mongoose.disconnect();
    },
  };
};

export default createApp;
