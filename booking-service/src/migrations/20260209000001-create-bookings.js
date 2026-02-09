'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('bookings', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      fecha: {
        type: Sequelize.DATE,
        allowNull: false
      },
      servicio: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      estado: {
        type: Sequelize.ENUM('activo', 'cancelada'),
        defaultValue: 'activo',
        allowNull: false
      },
      cancelada_en: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create indexes
    await queryInterface.addIndex('bookings', ['user_id'], {
      name: 'idx_bookings_user_id'
    });

    await queryInterface.addIndex('bookings', ['estado'], {
      name: 'idx_bookings_estado'
    });

    await queryInterface.addIndex('bookings', ['fecha'], {
      name: 'idx_bookings_fecha'
    });

    await queryInterface.addIndex('bookings', ['user_id', 'estado'], {
      name: 'idx_bookings_user_estado'
    });

    // Create trigger function for updated_at
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Create trigger
    await queryInterface.sequelize.query(`
      CREATE TRIGGER update_bookings_updated_at
        BEFORE UPDATE ON bookings
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);
  },

  async down(queryInterface, Sequelize) {
    // Drop trigger first
    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
    `);

    // Drop trigger function
    await queryInterface.sequelize.query(`
      DROP FUNCTION IF EXISTS update_updated_at_column();
    `);

    // Drop enum type (will be removed automatically with table)
    await queryInterface.dropTable('bookings');
  }
};
