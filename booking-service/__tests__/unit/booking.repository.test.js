const bookingRepository = require('../../src/repositories/booking.repository');
const Booking = require('../../src/models/Booking');
const sequelize = require('../../src/config/database');

describe('BookingRepository', () => {
  const testUserId = 'test-user-123';

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  afterEach(async () => {
    await Booking.destroy({ where: {}, truncate: true });
  });

  describe('create', () => {
    it('should create a booking successfully', async () => {
      const bookingData = {
        userId: testUserId,
        fecha: new Date('2026-03-15T10:00:00Z'),
        servicio: 'Hotel Paradise',
        estado: 'activo',
      };

      const booking = await bookingRepository.create(bookingData);

      expect(booking).toBeDefined();
      expect(booking.userId).toBe(testUserId);
      expect(booking.servicio).toBe('Hotel Paradise');
      expect(booking.estado).toBe('activo');
      expect(booking.canceladaEn).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should return all bookings for a user', async () => {
      await bookingRepository.create({
        userId: testUserId,
        fecha: new Date('2026-03-15'),
        servicio: 'Hotel A',
        estado: 'activo',
      });

      await bookingRepository.create({
        userId: testUserId,
        fecha: new Date('2026-03-20'),
        servicio: 'Hotel B',
        estado: 'cancelada',
      });

      const bookings = await bookingRepository.findByUserId(testUserId);

      expect(bookings).toHaveLength(2);
      expect(bookings[0].userId).toBe(testUserId);
    });

    it('should return empty array for user with no bookings', async () => {
      const bookings = await bookingRepository.findByUserId('non-existent-user');
      expect(bookings).toHaveLength(0);
    });
  });

  describe('findByIdAndUserId', () => {
    it('should find a booking by id and userId', async () => {
      const created = await bookingRepository.create({
        userId: testUserId,
        fecha: new Date('2026-03-15'),
        servicio: 'Hotel Test',
        estado: 'activo',
      });

      const found = await bookingRepository.findByIdAndUserId(created.id, testUserId);

      expect(found).toBeDefined();
      expect(found.id).toBe(created.id);
      expect(found.userId).toBe(testUserId);
    });

    it('should return null if booking not found', async () => {
      const found = await bookingRepository.findByIdAndUserId('non-existent-id', testUserId);
      expect(found).toBeNull();
    });
  });

  describe('deleteByIdAndUserId', () => {
    it('should delete a booking and return it', async () => {
      const created = await bookingRepository.create({
        userId: testUserId,
        fecha: new Date('2026-03-15'),
        servicio: 'Hotel Test',
        estado: 'activo',
      });

      const deleted = await bookingRepository.deleteByIdAndUserId(created.id, testUserId);

      expect(deleted).toBeDefined();
      expect(deleted.id).toBe(created.id);

      const found = await bookingRepository.findByIdAndUserId(created.id, testUserId);
      expect(found).toBeNull();
    });

    it('should return null if booking not found', async () => {
      const deleted = await bookingRepository.deleteByIdAndUserId('non-existent-id', testUserId);
      expect(deleted).toBeNull();
    });
  });

  describe('findUpcoming', () => {
    it('should return upcoming active bookings', async () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // Past booking - should not be included
      await bookingRepository.create({
        userId: testUserId,
        fecha: yesterday,
        servicio: 'Hotel Past',
        estado: 'activo',
      });

      // Future active booking - should be included
      await bookingRepository.create({
        userId: testUserId,
        fecha: tomorrow,
        servicio: 'Hotel Future',
        estado: 'activo',
      });

      // Future cancelled booking - should not be included
      await bookingRepository.create({
        userId: testUserId,
        fecha: tomorrow,
        servicio: 'Hotel Cancelled',
        estado: 'cancelada',
      });

      const upcoming = await bookingRepository.findUpcoming(testUserId, 5);

      expect(upcoming).toHaveLength(1);
      expect(upcoming[0].servicio).toBe('Hotel Future');
      expect(upcoming[0].estado).toBe('activo');
    });

    it('should limit results to specified number', async () => {
      const today = new Date();

      // Create 7 future bookings
      for (let i = 1; i <= 7; i++) {
        const futureDate = new Date(today);
        futureDate.setDate(futureDate.getDate() + i);
        await bookingRepository.create({
          userId: testUserId,
          fecha: futureDate,
          servicio: `Hotel ${i}`,
          estado: 'activo',
        });
      }

      const upcoming = await bookingRepository.findUpcoming(testUserId, 5);

      expect(upcoming).toHaveLength(5);
    });
  });

  describe('cancelAndPurge - ACID Transaction & Business Rule', () => {
    it('should cancel a booking and set canceladaEn timestamp', async () => {
      const booking = await bookingRepository.create({
        userId: testUserId,
        fecha: new Date('2026-03-15'),
        servicio: 'Hotel Test',
        estado: 'activo',
      });

      const cancelled = await bookingRepository.cancelAndPurge(booking.id, testUserId);

      expect(cancelled).toBeDefined();
      expect(cancelled.estado).toBe('cancelada');
      expect(cancelled.canceladaEn).toBeDefined();
      expect(cancelled.canceladaEn).toBeInstanceOf(Date);
    });

    it('should keep maximum 5 cancelled bookings per user', async () => {
      // Create 7 active bookings
      const bookings = [];
      for (let i = 1; i <= 7; i++) {
        const booking = await bookingRepository.create({
          userId: testUserId,
          fecha: new Date(`2026-03-${i + 10}`),
          servicio: `Hotel ${i}`,
          estado: 'activo',
        });
        bookings.push(booking);
      }

      // Cancel all 7 bookings one by one
      for (const booking of bookings) {
        await bookingRepository.cancelAndPurge(booking.id, testUserId);
        // Small delay to ensure different canceladaEn timestamps
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Verify only 5 cancelled bookings remain
      const allBookings = await bookingRepository.findByUserId(testUserId);
      const cancelledBookings = allBookings.filter(b => b.estado === 'cancelada');

      expect(cancelledBookings).toHaveLength(5);

      // Verify the oldest 2 were deleted (Hotel 1 and Hotel 2)
      const servicios = cancelledBookings.map(b => b.servicio).sort();
      expect(servicios).not.toContain('Hotel 1');
      expect(servicios).not.toContain('Hotel 2');
      expect(servicios).toContain('Hotel 3');
      expect(servicios).toContain('Hotel 7');
    });

    it('should handle transaction rollback on error', async () => {
      const booking = await bookingRepository.create({
        userId: testUserId,
        fecha: new Date('2026-03-15'),
        servicio: 'Hotel Test',
        estado: 'activo',
      });

      // Try to cancel with wrong userId
      const result = await bookingRepository.cancelAndPurge(booking.id, 'wrong-user');

      expect(result).toBeNull();

      // Verify booking was not modified
      const unchanged = await bookingRepository.findByIdAndUserId(booking.id, testUserId);
      expect(unchanged.estado).toBe('activo');
      expect(unchanged.canceladaEn).toBeNull();
    });

    it('should maintain data consistency during concurrent cancellations', async () => {
      // Create 6 bookings
      const bookings = [];
      for (let i = 1; i <= 6; i++) {
        const booking = await bookingRepository.create({
          userId: testUserId,
          fecha: new Date(`2026-03-${i + 10}`),
          servicio: `Hotel ${i}`,
          estado: 'activo',
        });
        bookings.push(booking);
      }

      // Cancel multiple bookings concurrently
      await Promise.all(
        bookings.map(booking => bookingRepository.cancelAndPurge(booking.id, testUserId))
      );

      // Verify only 5 cancelled bookings remain due to purge logic
      const allBookings = await bookingRepository.findByUserId(testUserId);
      const cancelledBookings = allBookings.filter(b => b.estado === 'cancelada');

      expect(cancelledBookings).toHaveLength(5);
    });
  });
});
