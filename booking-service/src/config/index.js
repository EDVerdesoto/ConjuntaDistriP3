require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT, 10) || 5000,

  db: {
    host:     process.env.DB_HOST     || 'postgres',
    port:     parseInt(process.env.DB_PORT, 10) || 5432,
    name:     process.env.DB_NAME     || 'bookingdb',
    user:     process.env.DB_USER     || 'booking',
    password: process.env.DB_PASSWORD || 'booking123',
    dialect:  'postgres',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'secreto-super-seguro',
  },

  services: {
    userService:         process.env.USER_SERVICE_URL         || 'http://user-service:5003',
    notificationService: process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:5002',
  },

  timezone: 'America/Guayaquil',
};
