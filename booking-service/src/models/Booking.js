const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Booking = sequelize.define('Booking', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'user_id',
  },
  fecha: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  servicio: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  estado: {
    type: DataTypes.ENUM('activo', 'cancelada'),
    defaultValue: 'activo',
    allowNull: false,
  },
  canceladaEn: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null,
    field: 'cancelada_en',
  },
}, {
  tableName: 'bookings',
  timestamps: true,
  underscored: true,
});

module.exports = Booking;
