// Jest setup file
process.env.NODE_ENV = 'test';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'bookingdb_test';
process.env.DB_USER = 'booking';
process.env.DB_PASSWORD = 'booking123';
process.env.JWT_SECRET = 'test-secret';
process.env.USER_SERVICE_URL = 'http://localhost:5003';
process.env.NOTIFICATION_SERVICE_URL = 'http://localhost:5002';
