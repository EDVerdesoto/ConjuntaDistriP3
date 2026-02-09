const bookingRepository = require('../repositories/booking.repository');
const userServiceAdapter = require('../adapters/userService.adapter');
const notificationAdapter = require('../adapters/notificationService.adapter');
const { formatInTimeZone } = require('date-fns-tz');
const { DateTime } = require('luxon');
const config = require('../config');

class BookingService {
  /**
   * Crea una nueva reserva y envía notificación.
   */
  async createBooking({ fecha, servicio }, token) {
    // 1. Verificar usuario contra user-service
    const user = await userServiceAdapter.verifyUser(token);

    // 2. Convertir fecha a zona horaria de Ecuador
    const fechaObj = DateTime.fromISO(fecha, { zone: config.timezone }).toJSDate();

    // 3. Crear reserva
    const booking = await bookingRepository.create({
      userId: user._id,
      fecha: fechaObj,
      servicio,
      estado: 'activo',
    });

    // 4. Notificar por email (fire-and-forget)
    const fechaFormateada = formatInTimeZone(fechaObj, config.timezone, 'dd/MM/yyyy HH:mm');
    notificationAdapter.notifyBookingCreated({
      email: user.email,
      nombre: user.nombre || 'Usuario',
      servicio,
      fecha: fechaFormateada,
    });

    return booking;
  }

  /**
   * Lista las reservas del usuario con fecha formateada.
   */
  async listBookings(token) {
    const user = await userServiceAdapter.verifyUser(token);
    const bookings = await bookingRepository.findByUserId(user._id);

    return bookings.map((b) => {
      const plain = b.toJSON();
      plain.fechaFormateada = formatInTimeZone(
        plain.fecha,
        config.timezone,
        'dd/MM/yyyy HH:mm:ss'
      );
      return plain;
    });
  }

  /**
   * Cancela una reserva, mantiene máximo 5 canceladas (ACID), y notifica.
   */
  async cancelBooking(id, token) {
    const user = await userServiceAdapter.verifyUser(token);

    const booking = await bookingRepository.cancelAndPurge(id, user._id);
    if (!booking) {
      throw new Error('Reserva no encontrada');
    }

    // Notificar cancelación (fire-and-forget)
    const fechaFormateada = formatInTimeZone(
      booking.fecha,
      config.timezone,
      'dd/MM/yyyy HH:mm'
    );
    notificationAdapter.notifyBookingCancelled({
      email: user.email,
      nombre: user.nombre || 'Usuario',
      servicio: booking.servicio,
      fecha: fechaFormateada,
    });

    return booking;
  }

  /**
   * Elimina una reserva por ID (solo si pertenece al usuario).
   */
  async deleteBooking(id, token) {
    const user = await userServiceAdapter.verifyUser(token);

    const deleted = await bookingRepository.deleteByIdAndUserId(id, user._id);
    if (!deleted) {
      throw new Error('Reserva no encontrada');
    }

    return deleted;
  }

  /**
   * Lista próximas reservas activas (fecha >= hoy, top 5).
   */
  async listUpcomingBookings(token) {
    const user = await userServiceAdapter.verifyUser(token);
    const bookings = await bookingRepository.findUpcoming(user._id, 5);

    return bookings.map((b) => {
      const plain = b.toJSON();
      plain.fechaFormateada = formatInTimeZone(
        plain.fecha,
        config.timezone,
        'dd/MM/yyyy HH:mm:ss'
      );
      return plain;
    });
  }
}

module.exports = new BookingService();
