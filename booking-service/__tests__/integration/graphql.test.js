const request = require('supertest');
const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const typeDefs = require('../../src/graphql/typeDefs');
const resolvers = require('../../src/graphql/resolvers');
const sequelize = require('../../src/config/database');
const Booking = require('../../src/models/Booking');
const userServiceAdapter = require('../../src/adapters/userService.adapter');
const notificationAdapter = require('../../src/adapters/notificationService.adapter');

jest.mock('../../src/adapters/userService.adapter');
jest.mock('../../src/adapters/notificationService.adapter');

describe('GraphQL Integration Tests', () => {
  let app;
  let server;
  const mockToken = 'Bearer mock-jwt-token';
  const mockUser = {
    _id: 'test-user-123',
    nombre: 'Test User',
    email: 'test@example.com',
  };

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    // Setup Express + Apollo Server
    app = express();
    server = new ApolloServer({
      typeDefs,
      resolvers,
      context: ({ req }) => ({ req }),
    });

    await server.start();
    server.applyMiddleware({ app });
  });

  afterAll(async () => {
    await server.stop();
    await sequelize.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    userServiceAdapter.verifyUser.mockResolvedValue(mockUser);
    notificationAdapter.notifyBookingCreated.mockResolvedValue();
    notificationAdapter.notifyBookingCancelled.mockResolvedValue();
  });

  afterEach(async () => {
    await Booking.destroy({ where: {}, truncate: true });
  });

  describe('Query: bookings', () => {
    it('should return all bookings for authenticated user', async () => {
      // Create test data
      await Booking.create({
        userId: mockUser._id,
        fecha: new Date('2026-03-15T10:00:00'),
        servicio: 'Hotel Paradise',
        estado: 'activo',
      });

      const query = `
        query {
          bookings {
            id
            userId
            servicio
            estado
            fechaFormateada
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', mockToken)
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.data.bookings).toHaveLength(1);
      expect(response.body.data.bookings[0].servicio).toBe('Hotel Paradise');
      expect(response.body.data.bookings[0].fechaFormateada).toBeDefined();
    });

    it('should return error without authentication token', async () => {
      const query = `
        query {
          bookings {
            id
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .send({ query });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Token no proporcionado');
    });
  });

  describe('Query: upcomingBookings', () => {
    it('should return only upcoming active bookings', async () => {
      const today = new Date();
      const future = new Date(today);
      future.setDate(future.getDate() + 5);
      const past = new Date(today);
      past.setDate(past.getDate() - 5);

      await Booking.create({
        userId: mockUser._id,
        fecha: past,
        servicio: 'Hotel Past',
        estado: 'activo',
      });

      await Booking.create({
        userId: mockUser._id,
        fecha: future,
        servicio: 'Hotel Future',
        estado: 'activo',
      });

      const query = `
        query {
          upcomingBookings {
            id
            servicio
            estado
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', mockToken)
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.data.upcomingBookings).toHaveLength(1);
      expect(response.body.data.upcomingBookings[0].servicio).toBe('Hotel Future');
    });
  });

  describe('Mutation: createBooking', () => {
    it('should create a new booking', async () => {
      const mutation = `
        mutation {
          createBooking(
            fecha: "2026-03-15T10:00:00"
            servicio: "Hotel Paradise"
          ) {
            id
            userId
            servicio
            estado
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', mockToken)
        .send({ query: mutation });

      expect(response.status).toBe(200);
      expect(response.body.data.createBooking).toBeDefined();
      expect(response.body.data.createBooking.servicio).toBe('Hotel Paradise');
      expect(response.body.data.createBooking.estado).toBe('activo');
      expect(response.body.data.createBooking.userId).toBe(mockUser._id);
    });

    it('should return error with invalid date format', async () => {
      const mutation = `
        mutation {
          createBooking(
            fecha: "invalid-date"
            servicio: "Hotel Paradise"
          ) {
            id
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', mockToken)
        .send({ query: mutation });

      expect(response.body.errors).toBeDefined();
    });
  });

  describe('Mutation: cancelBooking', () => {
    it('should cancel a booking successfully', async () => {
      const booking = await Booking.create({
        userId: mockUser._id,
        fecha: new Date('2026-03-15T10:00:00'),
        servicio: 'Hotel Paradise',
        estado: 'activo',
      });

      const mutation = `
        mutation($id: ID!) {
          cancelBooking(id: $id) {
            message
            booking {
              id
              estado
              canceladaEn
            }
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', mockToken)
        .send({
          query: mutation,
          variables: { id: booking.id },
        });

      expect(response.status).toBe(200);
      expect(response.body.data.cancelBooking.message).toContain('cancelada correctamente');
      expect(response.body.data.cancelBooking.booking.estado).toBe('cancelada');
      expect(response.body.data.cancelBooking.booking.canceladaEn).toBeDefined();
    });

    it('should enforce maximum 5 cancelled bookings rule', async () => {
      // Create 7 bookings
      const bookings = [];
      for (let i = 1; i <= 7; i++) {
        const booking = await Booking.create({
          userId: mockUser._id,
          fecha: new Date(`2026-03-${10 + i}T10:00:00`),
          servicio: `Hotel ${i}`,
          estado: 'activo',
        });
        bookings.push(booking);
      }

      // Cancel all bookings
      for (const booking of bookings) {
        const mutation = `
          mutation($id: ID!) {
            cancelBooking(id: $id) {
              message
            }
          }
        `;

        await request(app)
          .post('/graphql')
          .set('Authorization', mockToken)
          .send({
            query: mutation,
            variables: { id: booking.id },
          });

        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Verify only 5 cancelled bookings remain
      const allBookings = await Booking.findAll({
        where: { userId: mockUser._id },
      });

      const cancelledCount = allBookings.filter(b => b.estado === 'cancelada').length;
      expect(cancelledCount).toBe(5);
    });

    it('should return error when booking not found', async () => {
      const mutation = `
        mutation {
          cancelBooking(id: "non-existent-id") {
            message
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', mockToken)
        .send({ query: mutation });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Reserva no encontrada');
    });
  });

  describe('Mutation: deleteBooking', () => {
    it('should delete a booking successfully', async () => {
      const booking = await Booking.create({
        userId: mockUser._id,
        fecha: new Date('2026-03-15T10:00:00'),
        servicio: 'Hotel Paradise',
        estado: 'activo',
      });

      const mutation = `
        mutation($id: ID!) {
          deleteBooking(id: $id) {
            message
            booking {
              id
              servicio
            }
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', mockToken)
        .send({
          query: mutation,
          variables: { id: booking.id },
        });

      expect(response.status).toBe(200);
      expect(response.body.data.deleteBooking.message).toContain('eliminada correctamente');
      expect(response.body.data.deleteBooking.booking.id).toBe(booking.id);

      // Verify booking was deleted
      const found = await Booking.findByPk(booking.id);
      expect(found).toBeNull();
    });
  });

  describe('Schema Validation', () => {
    it('should validate GraphQL schema types correctly', async () => {
      const booking = await Booking.create({
        userId: mockUser._id,
        fecha: new Date('2026-03-15T10:00:00'),
        servicio: 'Hotel Paradise',
        estado: 'activo',
      });

      const query = `
        query {
          bookings {
            id
            userId
            fecha
            servicio
            estado
            canceladaEn
            fechaFormateada
            createdAt
            updatedAt
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', mockToken)
        .send({ query });

      expect(response.status).toBe(200);
      const bookingData = response.body.data.bookings[0];

      expect(typeof bookingData.id).toBe('string');
      expect(typeof bookingData.userId).toBe('string');
      expect(typeof bookingData.servicio).toBe('string');
      expect(typeof bookingData.estado).toBe('string');
      expect(typeof bookingData.fechaFormateada).toBe('string');
    });
  });
});
