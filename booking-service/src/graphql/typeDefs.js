const { gql } = require('apollo-server-express');

const typeDefs = gql`
  type Booking {
    id: ID!
    userId: String!
    fecha: String!
    servicio: String!
    estado: String!
    canceladaEn: String
    fechaFormateada: String
    createdAt: String
    updatedAt: String
  }

  type DeleteResult {
    message: String!
    booking: Booking
  }

  type CancelResult {
    message: String!
    booking: Booking
  }

  type Query {
    """
    Lista todas las reservas del usuario autenticado.
    """
    bookings: [Booking!]!

    """
    Lista las próximas 5 reservas activas (fecha >= hoy).
    """
    upcomingBookings: [Booking!]!
  }

  type Mutation {
    """
    Crea una nueva reserva y notifica por email.
    """
    createBooking(fecha: String!, servicio: String!): Booking!

    """
    Cancela una reserva: cambia estado, registra canceladaEn,
    mantiene máx 5 canceladas por usuario (transacción ACID),
    y notifica la cancelación por email.
    """
    cancelBooking(id: ID!): CancelResult!

    """
    Elimina una reserva por su ID (solo si pertenece al usuario).
    """
    deleteBooking(id: ID!): DeleteResult!
  }
`;

module.exports = typeDefs;
