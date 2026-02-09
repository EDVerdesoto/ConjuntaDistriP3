# 📚 GraphQL Operations Examples - Booking Service

Este documento contiene ejemplos de todas las operaciones GraphQL disponibles en el booking-service.

## 🔑 Autenticación

Todas las operaciones requieren un token JWT en el header:
```
Authorization: Bearer <tu-token-jwt>
```

Para obtener un token, primero debes autenticarte en el auth-service:
```bash
# 1. Registrar usuario
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Juan Pérez",
    "email": "juan@example.com",
    "password": "password123"
  }'

# 2. Iniciar sesión
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "juan@example.com",
    "password": "password123"
  }'
```

---

## 📖 Queries

### 1. Listar todas las reservas del usuario

```graphql
query ListarTodasLasReservas {
  bookings {
    id
    userId
    fecha
    servicio
    estado
    canceladaEn
    fechaFormateada
    createdAt
    updatedAt
  }
}
```

**Ejemplo con curl:**
```bash
curl -X POST http://localhost:5000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "query": "query { bookings { id servicio estado fechaFormateada } }"
  }'
```

**Respuesta esperada:**
```json
{
  "data": {
    "bookings": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "userId": "65a1b2c3d4e5f6g7h8i9j0k1",
        "fecha": "2026-03-15T10:00:00.000Z",
        "servicio": "Hotel Paradise - Habitación Doble",
        "estado": "activo",
        "canceladaEn": null,
        "fechaFormateada": "15/03/2026 05:00:00",
        "createdAt": "2026-02-09T12:00:00.000Z",
        "updatedAt": "2026-02-09T12:00:00.000Z"
      }
    ]
  }
}
```

---

### 2. Listar próximas 5 reservas activas

Lista las próximas reservas activas (fecha >= hoy) ordenadas por fecha ascendente.

```graphql
query ProximasReservas {
  upcomingBookings {
    id
    servicio
    fecha
    fechaFormateada
    estado
  }
}
```

**Ejemplo con curl:**
```bash
curl -X POST http://localhost:5000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "query": "query { upcomingBookings { id servicio fechaFormateada estado } }"
  }'
```

**Respuesta esperada:**
```json
{
  "data": {
    "upcomingBookings": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "servicio": "Hotel Paradise - Habitación Doble",
        "fecha": "2026-03-15T10:00:00.000Z",
        "fechaFormateada": "15/03/2026 05:00:00",
        "estado": "activo"
      }
    ]
  }
}
```

---

## ✏️ Mutations

### 3. Crear una reserva

Crea una nueva reserva y envía notificación por email.

```graphql
mutation CrearReserva {
  createBooking(
    fecha: "2026-03-15T10:00:00"
    servicio: "Hotel Paradise - Habitación Doble"
  ) {
    id
    userId
    fecha
    servicio
    estado
    fechaFormateada
  }
}
```

**Con variables:**
```graphql
mutation CrearReservaConVariables($fecha: String!, $servicio: String!) {
  createBooking(fecha: $fecha, servicio: $servicio) {
    id
    servicio
    estado
    fechaFormateada
  }
}
```

**Variables:**
```json
{
  "fecha": "2026-04-20T14:30:00",
  "servicio": "Hotel Ocean View - Suite Ejecutiva"
}
```

**Ejemplo con curl:**
```bash
curl -X POST http://localhost:5000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "query": "mutation($fecha: String!, $servicio: String!) { createBooking(fecha: $fecha, servicio: $servicio) { id servicio estado fechaFormateada } }",
    "variables": {
      "fecha": "2026-04-20T14:30:00",
      "servicio": "Hotel Ocean View - Suite Ejecutiva"
    }
  }'
```

**Respuesta esperada:**
```json
{
  "data": {
    "createBooking": {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "userId": "65a1b2c3d4e5f6g7h8i9j0k1",
      "fecha": "2026-04-20T14:30:00.000Z",
      "servicio": "Hotel Ocean View - Suite Ejecutiva",
      "estado": "activo",
      "fechaFormateada": "20/04/2026 09:30:00"
    }
  }
}
```

---

### 4. Cancelar una reserva

Cancela una reserva existente, actualiza su estado a "cancelada", y mantiene máximo 5 reservas canceladas por usuario (ACID transaction). También envía notificación de cancelación.

```graphql
mutation CancelarReserva {
  cancelBooking(id: "550e8400-e29b-41d4-a716-446655440000") {
    message
    booking {
      id
      servicio
      estado
      canceladaEn
      fechaFormateada
    }
  }
}
```

**Con variables:**
```graphql
mutation CancelarReservaConVariables($id: ID!) {
  cancelBooking(id: $id) {
    message
    booking {
      id
      servicio
      estado
      canceladaEn
    }
  }
}
```

**Variables:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Ejemplo con curl:**
```bash
curl -X POST http://localhost:5000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "query": "mutation($id: ID!) { cancelBooking(id: $id) { message booking { id estado canceladaEn } } }",
    "variables": {
      "id": "550e8400-e29b-41d4-a716-446655440000"
    }
  }'
```

**Respuesta esperada:**
```json
{
  "data": {
    "cancelBooking": {
      "message": "Reserva cancelada correctamente",
      "booking": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "servicio": "Hotel Paradise - Habitación Doble",
        "estado": "cancelada",
        "canceladaEn": "2026-02-09T15:30:00.000Z",
        "fechaFormateada": "15/03/2026 05:00:00"
      }
    }
  }
}
```

---

### 5. Eliminar una reserva

Elimina permanentemente una reserva de la base de datos.

```graphql
mutation EliminarReserva {
  deleteBooking(id: "550e8400-e29b-41d4-a716-446655440000") {
    message
    booking {
      id
      servicio
      estado
    }
  }
}
```

**Con variables:**
```graphql
mutation EliminarReservaConVariables($id: ID!) {
  deleteBooking(id: $id) {
    message
    booking {
      id
      servicio
    }
  }
}
```

**Variables:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Ejemplo con curl:**
```bash
curl -X POST http://localhost:5000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "query": "mutation($id: ID!) { deleteBooking(id: $id) { message booking { id servicio } } }",
    "variables": {
      "id": "550e8400-e29b-41d4-a716-446655440000"
    }
  }'
```

**Respuesta esperada:**
```json
{
  "data": {
    "deleteBooking": {
      "message": "Reserva eliminada correctamente",
      "booking": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "servicio": "Hotel Paradise - Habitación Doble",
        "estado": "activo"
      }
    }
  }
}
```

---

## 🧪 Pruebas de Regla de Negocio

### Verificar máximo 5 reservas canceladas

Esta regla de negocio garantiza que un usuario no pueda tener más de 5 reservas canceladas. Cuando se cancela una reserva y ya existen 5 canceladas, las más antiguas se eliminan automáticamente en una transacción ACID.

**Pasos para probar:**

1. **Crear 7 reservas:**
```bash
for i in {1..7}; do
  curl -X POST http://localhost:5000/graphql \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer YOUR_TOKEN_HERE" \
    -d "{
      \"query\": \"mutation { createBooking(fecha: \\\"2026-0$((i+2))-15T10:00:00\\\", servicio: \\\"Hotel Test $i\\\") { id } }\"
    }"
done
```

2. **Cancelar todas las reservas una por una:**
```bash
# Primero obtener los IDs
curl -X POST http://localhost:5000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"query": "query { bookings { id } }"}'

# Luego cancelar cada una (reemplazar ID)
curl -X POST http://localhost:5000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "query": "mutation { cancelBooking(id: \"ID_AQUI\") { message } }"
  }'
```

3. **Verificar que solo quedan 5 canceladas:**
```bash
curl -X POST http://localhost:5000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"query": "query { bookings { id estado } }"}'
```

**Resultado esperado:** Solo 5 reservas con `estado: "cancelada"` (las 5 más recientes).

---

## 🔧 GraphQL Playground

Para explorar el schema interactivamente, visita:
```
http://localhost:5000/graphql
```

El playground incluye:
- ✅ Autocompletado de queries y mutations
- ✅ Documentación integrada del schema
- ✅ Historial de queries
- ✅ Variables y headers configurables

---

## 📦 Colección Postman/Insomnia

También puedes importar la colección incluida en `booking-service/postman_collection.json` para probar todas las operaciones.

### Importar en Postman:
1. Abre Postman
2. Click en "Import"
3. Selecciona `postman_collection.json`
4. Configura la variable de entorno `token` con tu JWT

### Importar en Insomnia:
1. Abre Insomnia
2. Click en "Create" → "Import"
3. Selecciona `postman_collection.json`
4. Configura la variable de entorno `token` con tu JWT

---

## ❌ Manejo de Errores

### Error: Token no proporcionado
```json
{
  "errors": [
    {
      "message": "Token no proporcionado"
    }
  ]
}
```
**Solución:** Incluir header `Authorization: Bearer <token>`

### Error: Usuario no autenticado
```json
{
  "errors": [
    {
      "message": "Usuario no autenticado o token inválido"
    }
  ]
}
```
**Solución:** Obtener un nuevo token válido desde auth-service

### Error: Reserva no encontrada
```json
{
  "errors": [
    {
      "message": "Reserva no encontrada"
    }
  ]
}
```
**Solución:** Verificar que el ID de la reserva existe y pertenece al usuario autenticado
