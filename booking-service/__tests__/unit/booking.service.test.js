const bookingService = require('../../src/services/booking.service');
const bookingRepository = require('../../src/repositories/booking.repository');
const userServiceAdapter = require('../../src/adapters/userService.adapter');
const notificationAdapter = require('../../src/adapters/notificationService.adapter');
const sequelize = require('../../src/config/database');
const Booking = require('../../src/models/Booking');

// Mock external adapters
jest.mock('../../src/adapters/userService.adapter');
jest.mock('../../src/adapters/notificationService.adapter');

describe('BookingService', () => {
  const mockToken = 'mock-jwt-token';
  const mockUser = {
    _id: 'test-user-123',
    nombre: 'Test User',
    email: 'test@example.com',
  };

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Default mock implementation for user verification
    userServiceAdapter.verifyUser.mockResolvedValue(mockUser);

    // Default mock implementation for notifications
    notificationAdapter.notifyBookingCreated.mockResolvedValue();
    notificationAdapter.notifyBookingCancelled.mockResolvedValue();
  });

  afterEach(async () => {
    await Booking.destroy({ where: {}, truncate: true });
  });

  describe('createBooking', () => {
    it('should create a booking and notify user', async () => {
      const bookingData = {
        fecha: '2026-03-15T10:00:00',
        servicio: 'Hotel Paradise',
      };

      const booking = await bookingService.createBooking(bookingData, mockToken);

      expect(booking).toBeDefined();
      expect(booking.userId).toBe(mockUser._id);
      expect(booking.servicio).toBe('Hotel Paradise');
      expect(booking.estado).toBe('activo');

      // Verify user was verified
      expect(userServiceAdapter.verifyUser).toHaveBeenCalledWith(mockToken);

      // Verify notification was sent
      expect(notificationAdapter.notifyBookingCreated).toHaveBeenCalledWith(
        expect.objectContaining({
          email: mockUser.email,
          nombre: mockUser.nombre,
          servicio: 'Hotel Paradise',
        })
      );
    });

    it('should throw error if user verification fails', async () => {
      userServiceAdapter.verifyUser.mockRejectedValue(new Error('Token inválido'));

      await expect(
        bookingService.createBooking(
          { fecha: '2026-03-15T10:00:00', servicio: 'Hotel Test' },
          'invalid-token'
        )
      ).rejects.toThrow('Token inválido');

      // Verify notification was not sent
      expect(notificationAdapter.notifyBookingCreated).not.toHaveBeenCalled();
    });

    it('should create booking even if notification fails', async () => {
      notificationAdapter.notifyBookingCreated.mockRejectedValue(
        new Error('Notification service down')
      );

      const bookingData = {
        fecha: '2026-03-15T10:00:00',
        servicio: 'Hotel Test',
      };

      const booking = await bookingService.createBooking(bookingData, mockToken);

      expect(booking).toBeDefined();
      expect(booking.servicio).toBe('Hotel Test');
    });
  });

  describe('listBookings', () => {
    it('should list all bookings for authenticated user', async () => {
      // Create test bookings
      await bookingRepository.create({
        userId: mockUser._id,
        fecha: new Date('2026-03-15'),
        servicio: 'Hotel A',
        estado: 'activo',
      });

      await bookingRepository.create({
        userId: mockUser._id,
        fecha: new Date('2026-03-20'),
        servicio: 'Hotel B',
        estado: 'cancelada',
      });

      const bookings = await bookingService.listBookings(mockToken);

      expect(bookings).toHaveLength(2);
      expect(bookings[0].fechaFormateada).toBeDefined();
      expect(userServiceAdapter.verifyUser).toHaveBeenCalledWith(mockToken);
    });

    it('should return empty array if user has no bookings', async () => {
      const bookings = await bookingService.listBookings(mockToken);
      expect(bookings).toHaveLength(0);
    });
  });

  describe('cancelBooking', () => {
    it('should cancel booking and notify user', async () => {
      const booking = await bookingRepository.create({
        userId: mockUser._id,
        fecha: new Date('2026-03-15T10:00:00'),
        servicio: 'Hotel Test',
        estado: 'activo',
      });

      const cancelled = await bookingService.cancelBooking(booking.id, mockToken);

      expect(cancelled.estado).toBe('cancelada');
      expect(cancelled.canceladaEn).toBeDefined();

      expect(userServiceAdapter.verifyUser).toHaveBeenCalledWith(mockToken);
      expect(notificationAdapter.notifyBookingCancelled).toHaveBeenCalledWith(
        expect.objectContaining({
          email: mockUser.email,
          servicio: 'Hotel Test',
        })
      );
    });

    it('should throw error if booking not found', async () => {
      await expect(
        bookingService.cancelBooking('non-existent-id', mockToken)
      ).rejects.toThrow('Reserva no encontrada');

      expect(notificationAdapter.notifyBookingCancelled).not.toHaveBeenCalled();
    });

    it('should enforce maximum 5 cancelled bookings rule', async () => {
      // Create and cancel 7 bookings
      const bookings = [];
      for (let i = 1; i <= 7; i++) {
        const booking = await bookingRepository.create({
          userId: mockUser._id,
          fecha: new Date(`2026-03-${i + 10}`),
          servicio: `Hotel ${i}`,
          estado: 'activo',
        });
        bookings.push(booking);
      }

      // Cancel all bookings
      for (const booking of bookings) {
        await bookingService.cancelBooking(booking.id, mockToken);
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Verify only 5 cancelled bookings remain
      const allBookings = await bookingService.listBookings(mockToken);
      const cancelledBookings = allBookings.filter(b => b.estado === 'cancelada');

      expect(cancelledBookings).toHaveLength(5);
    });
  });

  describe('deleteBooking', () => {
    it('should delete a booking', async () => {
      const booking = await bookingRepository.create({
        userId: mockUser._id,
        fecha: new Date('2026-03-15'),
        servicio: 'Hotel Test',
        estado: 'activo',
      });

      const deleted = await bookingService.deleteBooking(booking.id, mockToken);

      expect(deleted).toBeDefined();
      expect(deleted.id).toBe(booking.id);

      expect(userServiceAdapter.verifyUser).toHaveBeenCalledWith(mockToken);
    });

    it('should throw error if booking not found', async () => {
      await expect(
        bookingService.deleteBooking('non-existent-id', mockToken)
      ).rejects.toThrow('Reserva no encontrada');
    });
  });

  describe('listUpcomingBookings', () => {
    it('should return only upcoming active bookings', async () => {
      const today = new Date();
      const future = new Date(today);
      future.setDate(future.getDate() + 5);
      const past = new Date(today);
      past.setDate(past.getDate() - 5);

      // Past booking
      await bookingRepository.create({
        userId: mockUser._id,
        fecha: past,
        servicio: 'Hotel Past',
        estado: 'activo',
      });

      // Future active booking
      await bookingRepository.create({
        userId: mockUser._id,
        fecha: future,
        servicio: 'Hotel Future',
        estado: 'activo',
      });

      // Future cancelled booking
      await bookingRepository.create({
        userId: mockUser._id,
        fecha: future,
        servicio: 'Hotel Cancelled',
        estado: 'cancelada',
      });

      const upcoming = await bookingService.listUpcomingBookings(mockToken);

      expect(upcoming).toHaveLength(1);
      expect(upcoming[0].servicio).toBe('Hotel Future');
      expect(upcoming[0].estado).toBe('activo');
      expect(upcoming[0].fechaFormateada).toBeDefined();
    });

    it('should limit results to 5 bookings', async () => {
      const today = new Date();

      // Create 7 future bookings
      for (let i = 1; i <= 7; i++) {
        const futureDate = new Date(today);
        futureDate.setDate(futureDate.getDate() + i);
        await bookingRepository.create({
          userId: mockUser._id,
          fecha: futureDate,
          servicio: `Hotel ${i}`,
          estado: 'activo',
        });
      }

      const upcoming = await bookingService.listUpcomingBookings(mockToken);

      expect(upcoming).toHaveLength(5);
    });
  });
});
