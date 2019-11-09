const config = {
  mongoURL: process.env.MONGODB_URL || '',
  port: +(process.env.PORT || '3000'),
  tokenSecret: process.env.TOKEN_SECRET || '',
  adminPassword: process.env.ADMIN_PASSWORD || '',
  email: {
    sender: process.env.SENDER_EMAIL || '',
    password: process.env.SENDER_EMAIL_PASSWORD || '',
  },
  availableRoles: {
    admin: ['admin'],
    all: ['admin', 'user'],
    user: ['user'],
  },
};

export default config;
