# 🏨 Booking Service - Servicio de Reservas

Microservicio de gestión de reservas desarrollado con **GraphQL**, **PostgreSQL**, y arquitectura por capas (SOLID). Maneja la creación, listado, cancelación y eliminación de reservas con validación de usuarios y notificaciones automáticas.

---

## 📋 Tabla de Contenidos

- [Características](#-características)
- [Arquitectura](#-arquitectura)
- [Tecnologías](#-tecnologías)
- [Variables de Entorno](#-variables-de-entorno)
- [Instalación y Ejecución Local](#-instalación-y-ejecución-local)
- [Despliegue en Kubernetes](#-despliegue-en-kubernetes)
- [Operaciones GraphQL](#-operaciones-graphql)
- [Validación de Usuarios](#-validación-de-usuarios)
- [Reglas de Negocio](#-reglas-de-negocio)
- [Pruebas](#-pruebas)
- [Esquema de Base de Datos](#-esquema-de-base-de-datos)

---

## ✨ Características

- ✅ **API GraphQL** completa con queries y mutations
- ✅ **Base de datos relacional** (PostgreSQL) con Sequelize ORM
- ✅ **Transacciones ACID** para operaciones críticas
- ✅ **Arquitectura por capas** (Resolvers → Services → Repositories → Models)
- ✅ **Validación de usuarios** contra user-service
- ✅ **Notificaciones automáticas** vía notification-service
- ✅ **Healthchecks** para Kubernetes (liveness/readiness)
- ✅ **Pruebas unitarias e integración** con Jest
- ✅ **Migraciones de base de datos** con Sequelize CLI

---

## 🏗️ Arquitectura

### Estructura de Capas (SOLID)

```
src/
├── graphql/
│   ├── typeDefs.js      # Schema GraphQL (types, queries, mutations)
│   └── resolvers.js     # Resolvers GraphQL (delegan a services)
├── services/
│   └── booking.service.js    # Lógica de negocio
├── repositories/
│   └── booking.repository.js # Acceso a datos (CRUD + transacciones)
├── models/
│   └── Booking.js            # Modelo Sequelize
├── adapters/
│   ├── userService.adapter.js         # Cliente HTTP para user-service
│   └── notificationService.adapter.js # Cliente HTTP para notification-service
├── config/
│   ├── index.js         # Configuración centralizada
│   ├── database.js      # Conexión Sequelize
│   └── database.json    # Config para Sequelize CLI
├── migrations/
│   └── 20260209000001-create-bookings.js
└── app.js               # Punto de entrada (Express + Apollo Server)
```

### Principios SOLID

- **S (Single Responsibility):** Cada capa tiene una responsabilidad única
- **O (Open/Closed):** Extensible mediante adapters y nuevos resolvers
- **L (Liskov Substitution):** Repositorios e interfaces intercambiables
- **I (Interface Segregation):** GraphQL schema define contratos claros
- **D (Dependency Inversion):** Services dependen de abstracciones (adapters)

---

## 🛠️ Tecnologías

| Tecnología | Versión | Propósito |
|-----------|---------|-----------|
| Node.js | 18+ | Runtime |
| Express | 4.18 | HTTP server |
| Apollo Server | 3.13 | GraphQL server |
| GraphQL | 16.8 | Query language |
| PostgreSQL | 16 | Base de datos relacional |
| Sequelize | 6.35 | ORM |
| Jest | 29.7 | Testing framework |
| Docker | 24+ | Containerización |

---

## 🔐 Variables de Entorno

Archivo `.env` requerido:

```bash
# Puerto del servicio
PORT=5000

# PostgreSQL
DB_HOST=postgres
DB_PORT=5432
DB_NAME=bookingdb
DB_USER=booking
DB_PASSWORD=booking123

# JWT (para validación de tokens)
JWT_SECRET=secreto-super-seguro

# URLs de microservicios
USER_SERVICE_URL=http://user-service:5003
NOTIFICATION_SERVICE_URL=http://notification-service:5002
```

### Variables en Kubernetes

En K8s, estas variables se inyectan desde:
- **ConfigMap** (`booking-config`): PORT, DB_HOST, DB_PORT, DB_NAME, DB_USER, service URLs
- **Secret** (`booking-secrets`): DB_PASSWORD, JWT_SECRET

---

## 🚀 Instalación y Ejecución Local

### Opción 1: Docker Compose (Recomendado)

Solo ejecuta booking-service + PostgreSQL:

```bash
# Clonar repositorio
git clone <tu-repo>
cd app-reservas

# Crear archivo .env en booking-service/
cp booking-service/.env.example booking-service/.env

# Levantar servicios
docker-compose up -d postgres booking-service

# Ver logs
docker-compose logs -f booking-service

# Aplicar migraciones (primera vez)
docker-compose exec booking-service npm run db:migrate
```

**Acceso:** `http://localhost:5000/graphql`

### Opción 2: Ejecución Manual

```bash
# 1. Instalar dependencias
cd booking-service
npm install

# 2. Levantar PostgreSQL (usando Docker)
docker run -d \
  --name postgres \
  -e POSTGRES_DB=bookingdb \
  -e POSTGRES_USER=booking \
  -e POSTGRES_PASSWORD=booking123 \
  -p 5432:5432 \
  postgres:16-alpine

# 3. Configurar .env
cp .env.example .env
# Editar .env con DB_HOST=localhost

# 4. Aplicar migraciones
npm run db:migrate

# 5. Iniciar servicio
npm run dev  # Modo desarrollo con nodemon
# o
npm start    # Modo producción
```

### Verificar Funcionamiento

```bash
# Healthcheck
curl http://localhost:5000/health

# GraphQL Playground
# Abrir en navegador: http://localhost:5000/graphql
```

---

## ☸️ Despliegue en Kubernetes

### Requisitos Previos

- Cluster de Kubernetes activo
- `kubectl` configurado
- Docker images construidas y disponibles

### Pasos de Despliegue

```bash
# 1. Construir imagen Docker
cd booking-service
docker build -t booking-service:latest .

# 2. Aplicar manifiestos en orden
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/postgres.yaml

# Esperar a que PostgreSQL esté listo
kubectl wait --for=condition=ready pod -l app=postgres -n booking --timeout=120s

# 3. Desplegar booking-service
kubectl apply -f k8s/deployment.yaml

# 4. Verificar despliegue
kubectl get pods -n booking
kubectl logs -n booking deployment/booking-service
```

### Aplicar Migraciones en K8s

```bash
# Obtener nombre del pod
POD=$(kubectl get pod -n booking -l app=booking-service -o jsonpath="{.items[0].metadata.name}")

# Ejecutar migraciones
kubectl exec -n booking $POD -- npm run db:migrate
```

### Exponer Servicio (Opcional)

```bash
# Port forward para pruebas
kubectl port-forward -n booking svc/booking-service 5000:5000

# O crear un Ingress/LoadBalancer
kubectl apply -f k8s/ingress.yaml  # (si está disponible)
```

### Monitoreo

```bash
# Ver logs
kubectl logs -n booking -l app=booking-service -f

# Verificar healthchecks
kubectl exec -n booking $POD -- curl -s http://localhost:5000/health

# Estadísticas del pod
kubectl top pod -n booking
```

---

## 📖 Operaciones GraphQL

### Ejemplos Rápidos

Ver documentación completa en [`GRAPHQL_EXAMPLES.md`](./GRAPHQL_EXAMPLES.md)

#### Crear Reserva
```graphql
mutation {
  createBooking(
    fecha: "2026-03-15T10:00:00"
    servicio: "Hotel Paradise - Suite"
  ) {
    id
    servicio
    estado
    fechaFormateada
  }
}
```

#### Listar Reservas
```graphql
query {
  bookings {
    id
    servicio
    estado
    fechaFormateada
  }
}
```

#### Cancelar Reserva
```graphql
mutation {
  cancelBooking(id: "tu-booking-id") {
    message
    booking {
      estado
      canceladaEn
    }
  }
}
```

### Colección Postman/Insomnia

Importa `postman_collection.json` para probar todas las operaciones con ejemplos pre-configurados.

---

## 🔒 Validación de Usuarios

### Flujo de Validación

1. **Cliente envía GraphQL request** con header:
   ```
   Authorization: Bearer <jwt-token>
   ```

2. **Resolver extrae el token** del contexto de la petición

3. **Service delega a UserServiceAdapter:**
   ```javascript
   // src/adapters/userService.adapter.js
   async verifyUser(token) {
     const response = await axios.get(`${USER_SERVICE_URL}/users/me`, {
       headers: { Authorization: `Bearer ${token}` }
     });
     return response.data; // { _id, nombre, email }
   }
   ```

4. **User-service valida JWT** y retorna datos del usuario

5. **Booking-service usa userId** para crear/consultar reservas

### Manejo de Errores

| Error | Código | Mensaje |
|-------|--------|---------|
| Sin token | 401 | "Token no proporcionado" |
| Token inválido | 401 | "Usuario no autenticado o token inválido" |
| Usuario no existe | 404 | "Usuario no encontrado en user-service" |
| Timeout | 500 | "Error al verificar usuario con user-service" |

---

## 📏 Reglas de Negocio

### 1. Máximo 5 Reservas Canceladas por Usuario

**Implementación:** Cuando se cancela una reserva, si el usuario tiene más de 5 reservas canceladas, se eliminan automáticamente las más antiguas.

**Código:**
```javascript
// src/repositories/booking.repository.js
async cancelAndPurge(id, userId) {
  return sequelize.transaction(async (t) => {
    // 1. Marcar como cancelada
    booking.estado = 'cancelada';
    booking.canceladaEn = new Date();
    await booking.save({ transaction: t });

    // 2. Obtener todas las canceladas (ordenadas por antigüedad)
    const canceladas = await Booking.findAll({
      where: { userId, estado: 'cancelada' },
      order: [['cancelada_en', 'ASC']],
      transaction: t
    });

    // 3. Eliminar las más antiguas si hay > 5
    if (canceladas.length > 5) {
      const toDelete = canceladas.slice(0, canceladas.length - 5);
      await Booking.destroy({
        where: { id: { [Op.in]: toDelete.map(r => r.id) } },
        transaction: t
      });
    }

    return booking;
  });
}
```

**Garantías ACID:**
- ✅ **Atomicidad:** Todo ocurre o nada ocurre
- ✅ **Consistencia:** Siempre ≤ 5 canceladas
- ✅ **Aislamiento:** Locks evitan race conditions
- ✅ **Durabilidad:** Cambios persistidos en PostgreSQL

### 2. Solo Próximas Reservas Activas

La query `upcomingBookings` filtra por:
- `estado = 'activo'`
- `fecha >= HOY`
- Ordenadas ascendentemente
- Máximo 5 resultados

---

## 🧪 Pruebas

### Ejecutar Tests

```bash
# Todos los tests
npm test

# Tests con cobertura
npm run test -- --coverage

# Tests en watch mode
npm run test:watch

# Tests específicos
npm test -- booking.repository.test.js
```

### Estructura de Tests

```
__tests__/
├── setup.js                        # Configuración global
├── unit/
│   ├── booking.repository.test.js  # Tests de repositorio (ACID, reglas)
│   └── booking.service.test.js     # Tests de servicio (lógica)
└── integration/
    └── graphql.test.js             # Tests de API completa
```

### Cobertura Objetivo

- **Branches:** ≥70%
- **Functions:** ≥80%
- **Lines:** ≥80%
- **Statements:** ≥80%

### Pruebas de Regla de Negocio (5 Canceladas)

```javascript
it('should keep maximum 5 cancelled bookings per user', async () => {
  // Crear 7 reservas
  const bookings = await Promise.all(
    Array.from({ length: 7 }, (_, i) => 
      bookingRepository.create({
        userId: 'test-user',
        fecha: new Date(`2026-03-${i+10}`),
        servicio: `Hotel ${i+1}`,
        estado: 'activo'
      })
    )
  );

  // Cancelar todas
  for (const booking of bookings) {
    await bookingRepository.cancelAndPurge(booking.id, 'test-user');
  }

  // Verificar solo 5 canceladas
  const result = await bookingRepository.findByUserId('test-user');
  const canceladas = result.filter(b => b.estado === 'cancelada');
  
  expect(canceladas).toHaveLength(5);
});
```

---

## 🗄️ Esquema de Base de Datos

### Tabla: `bookings`

| Columna | Tipo | Constraints | Descripción |
|---------|------|-------------|-------------|
| `id` | UUID | PK, NOT NULL | Identificador único |
| `user_id` | VARCHAR(255) | NOT NULL, INDEXED | ID del usuario (MongoDB ObjectId) |
| `fecha` | TIMESTAMP | NOT NULL, INDEXED | Fecha/hora de la reserva |
| `servicio` | VARCHAR(255) | NOT NULL | Nombre del servicio reservado |
| `estado` | ENUM('activo', 'cancelada') | NOT NULL, DEFAULT 'activo', INDEXED | Estado actual |
| `cancelada_en` | TIMESTAMP | NULL | Timestamp de cancelación |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Fecha de creación |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Última actualización |

### Índices

```sql
-- Búsqueda por usuario
CREATE INDEX idx_bookings_user_id ON bookings(user_id);

-- Filtrado por estado
CREATE INDEX idx_bookings_estado ON bookings(estado);

-- Filtrado por fecha (próximas reservas)
CREATE INDEX idx_bookings_fecha ON bookings(fecha);

-- Búsqueda compuesta (optimización de queries frecuentes)
CREATE INDEX idx_bookings_user_estado ON bookings(user_id, estado);
```

### Migraciones

```bash
# Crear nueva migración
npm run sequelize-cli migration:generate -- --name nombre-migracion

# Aplicar migraciones pendientes
npm run db:migrate

# Revertir última migración
npm run db:migrate:undo

# Ver estado de migraciones
npm run db:migrate:status
```

### DDL Completo

```sql
-- Ver archivo: src/migrations/20260209000001-create-bookings.js
-- O exportar desde PostgreSQL:
docker exec postgres pg_dump -U booking --schema-only bookingdb
```

---

## 🐛 Troubleshooting

### Error: "Connection refused" a PostgreSQL

```bash
# Verificar que PostgreSQL está corriendo
docker ps | grep postgres

# Ver logs de PostgreSQL
docker logs postgres

# Verificar conectividad
docker exec booking-service pg_isready -h postgres -U booking
```

### Error: "Token inválido"

```bash
# Obtener nuevo token desde auth-service
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Error: "Reserva no encontrada"

- Verificar que el ID es correcto (UUID válido)
- Confirmar que la reserva pertenece al usuario autenticado
- Revisar logs: `docker logs booking-service`

### Healthchecks Fallando en K8s

```bash
# Ver eventos del pod
kubectl describe pod -n booking <pod-name>

# Verificar readiness probe manualmente
kubectl exec -n booking <pod-name> -- curl http://localhost:5000/ready

# Revisar conectividad a PostgreSQL
kubectl exec -n booking <pod-name> -- nc -zv postgres-service 5432
```

---

## 📚 Recursos Adicionales

- [GraphQL Operations Examples](./GRAPHQL_EXAMPLES.md)
- [Postman Collection](./postman_collection.json)
- [Kubernetes Deployment Guide](../k8s/README.md)
- [Schema GraphQL Documentation](http://localhost:5000/graphql) (cuando el servicio está corriendo)

---

## 📄 Licencia

MIT License - Ver archivo `LICENSE` en la raíz del proyecto

---

## 👥 Contribución

Para contribuir:
1. Fork del repositorio
2. Crear feature branch (`git checkout -b feature/nueva-funcionalidad`)
3. Commit de cambios (`git commit -m 'Add: nueva funcionalidad'`)
4. Push al branch (`git push origin feature/nueva-funcionalidad`)
5. Abrir Pull Request

---

## 📧 Contacto

Para preguntas o soporte, contactar al equipo de desarrollo.
