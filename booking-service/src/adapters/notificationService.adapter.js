const axios = require('axios');
const config = require('../config');

class NotificationServiceAdapter {
  constructor() {
    this.baseUrl = config.services.notificationService;
  }

  /**
   * Notifica la creación de una reserva.
   */
  async notifyBookingCreated({ email, nombre, servicio, fecha }) {
    try {
      await axios.post(`${this.baseUrl}/notify/reserva`, {
        email,
        nombre,
        servicio,
        fecha,
      }, { timeout: 5000 });
    } catch (error) {
      console.error('⚠️ Error al notificar reserva:', error.message);
      // No propagar: la reserva ya fue creada
    }
  }

  /**
   * Notifica la cancelación de una reserva.
   */
  async notifyBookingCancelled({ email, nombre, servicio, fecha }) {
    try {
      await axios.post(`${this.baseUrl}/notify/cancelacion`, {
        email,
        nombre,
        servicio,
        fecha,
      }, { timeout: 5000 });
    } catch (error) {
      console.error('⚠️ Error al notificar cancelación:', error.message);
      // No propagar: la cancelación ya fue procesada
    }
  }
}

module.exports = new NotificationServiceAdapter();
