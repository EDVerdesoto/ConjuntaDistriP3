const bookingService = require('../services/booking.service');

/**
 * Extrae el token del contexto de la petición.
 */
function getToken(context) {
  const auth = context.req?.headers?.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    throw new Error('Token no proporcionado');
  }
  return auth.split(' ')[1];
}

const resolvers = {
  Query: {
    bookings: async (_parent, _args, context) => {
      const token = getToken(context);
      return bookingService.listBookings(token);
    },

    upcomingBookings: async (_parent, _args, context) => {
      const token = getToken(context);
      return bookingService.listUpcomingBookings(token);
    },
  },

  Mutation: {
    createBooking: async (_parent, { fecha, servicio }, context) => {
      const token = getToken(context);
      const booking = await bookingService.createBooking({ fecha, servicio }, token);
      return booking.toJSON();
    },

    cancelBooking: async (_parent, { id }, context) => {
      const token = getToken(context);
      const booking = await bookingService.cancelBooking(id, token);
      return {
        message: 'Reserva cancelada correctamente',
        booking: booking.toJSON(),
      };
    },

    deleteBooking: async (_parent, { id }, context) => {
      const token = getToken(context);
      const booking = await bookingService.deleteBooking(id, token);
      return {
        message: 'Reserva eliminada correctamente',
        booking: booking.toJSON(),
      };
    },
  },
};

module.exports = resolvers;
