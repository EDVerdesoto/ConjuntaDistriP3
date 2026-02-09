const axios = require('axios');
const config = require('../config');

class UserServiceAdapter {
  constructor() {
    this.baseUrl = config.services.userService;
  }

  /**
   * Verifica que el usuario es válido consultando GET /users/me
   * con el token JWT proporcionado.
   * Retorna los datos del usuario o lanza un error.
   */
  async verifyUser(token) {
    try {
      const response = await axios.get(`${this.baseUrl}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
      });
      return response.data; // { _id, nombre, email, ... }
    } catch (error) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new Error('Usuario no autenticado o token inválido');
        }
        if (status === 404) {
          throw new Error('Usuario no encontrado en user-service');
        }
      }
      throw new Error('Error al verificar usuario con user-service');
    }
  }
}

module.exports = new UserServiceAdapter();
