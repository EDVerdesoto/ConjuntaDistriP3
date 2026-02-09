const { Op } = require('sequelize');
const Booking = require('../models/Booking');
const sequelize = require('../config/database');

class BookingRepository {
  /**
   * Crear una nueva reserva.
   */
  async create({ userId, fecha, servicio, estado = 'activo' }) {
    return Booking.create({ userId, fecha, servicio, estado });
  }

  /**
   * Encontrar todas las reservas de un usuario.
   */
  async findByUserId(userId) {
    return Booking.findAll({
      where: { userId },
      order: [['fecha', 'DESC']],
    });
  }

  /**
   * Encontrar una reserva por ID y userId.
   */
  async findByIdAndUserId(id, userId) {
    return Booking.findOne({ where: { id, userId } });
  }

  /**
   * Eliminar una reserva por ID y userId. Retorna la reserva eliminada o null.
   */
  async deleteByIdAndUserId(id, userId) {
    const booking = await Booking.findOne({ where: { id, userId } });
    if (!booking) return null;
    await booking.destroy();
    return booking;
  }

  /**
   * Próximas reservas activas (fecha >= hoy), top N.
   */
  async findUpcoming(userId, limit = 5) {
    return Booking.findAll({
      where: {
        userId,
        estado: 'activo',
        fecha: { [Op.gte]: new Date() },
      },
      order: [['fecha', 'ASC']],
      limit,
    });
  }

  /**
   * Cancelar reserva y depurar canceladas (máx 5) en una transacción ACID.
   * Retorna la reserva cancelada.
   */
  async cancelAndPurge(id, userId) {
    return sequelize.transaction(async (t) => {
      // 1. Buscar la reserva
      const booking = await Booking.findOne({
        where: { id, userId },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!booking) return null;

      // 2. Marcar como cancelada
      booking.estado = 'cancelada';
      booking.canceladaEn = new Date();
      await booking.save({ transaction: t });

      // 3. Obtener todas las canceladas del usuario, ordenadas de más antigua a más reciente
      const canceladas = await Booking.findAll({
        where: { userId, estado: 'cancelada' },
        order: [['cancelada_en', 'ASC']],
        transaction: t,
      });

      // 4. Si hay más de 5, eliminar las más antiguas
      if (canceladas.length > 5) {
        const aEliminar = canceladas.slice(0, canceladas.length - 5);
        const idsAEliminar = aEliminar.map((r) => r.id);
        await Booking.destroy({
          where: { id: { [Op.in]: idsAEliminar } },
          transaction: t,
        });
      }

      return booking;
    });
  }
}

module.exports = new BookingRepository();
