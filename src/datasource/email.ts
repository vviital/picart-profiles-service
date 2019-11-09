import * as nodemailer from 'nodemailer';
import { get } from 'lodash';

import config from '../config';

type EmailContent = {
  subject: string
  html: string
}

const getPasswordEmailTemplate = (params: object): EmailContent => {
  return ({
    subject: 'Your account has been successfully created in the system!',
    html: `<p>Your password: ${get(params, 'password', 'no password')}<p>`,
  });
}

type Topics = {
  password: (params: object) => EmailContent
}

const topics: Topics = {
  password: getPasswordEmailTemplate,
}

export type Options = {
  to: string
  topic: keyof Topics
  params: object
}

const transport = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: config.email.sender,
    pass: config.email.password,
  },
});

const create = async (options: Options) => {
  const mailOptions = {
    from: config.email.sender,
    to: options.to,
    ...topics[options.topic](options.params),
  };

  try {
    await transport.sendMail(mailOptions);
  } catch (err) {
    console.error(err);
  }
}

export default {
  create,
};
