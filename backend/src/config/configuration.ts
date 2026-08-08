export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  apiPrefix: process.env.API_PREFIX || 'api',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'insights_db',
    // Auto-creates/updates tables from entities. Handy while there's no migration system yet;
    // set DB_SYNCHRONIZE=false once migrations are introduced for a real production deploy.
    synchronize: process.env.DB_SYNCHRONIZE !== 'false',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dev_secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },
  superAdmin: {
    email: process.env.SUPER_ADMIN_EMAIL,
    password: process.env.SUPER_ADMIN_PASSWORD,
    fullName: process.env.SUPER_ADMIN_NAME,
    phone: process.env.SUPER_ADMIN_PHONE,
  },
});
