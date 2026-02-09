# 📆 ReservasEC - Sistema de Gestión de Reservas

**ReservasEC** es una plataforma fullstack de gestión de reservas desarrollada con una arquitectura de microservicios. Permite a los usuarios registrarse, iniciar sesión, gestionar su perfil, crear y cancelar reservas, y recibir notificaciones automáticas. El sistema está completamente dockerizado y listo para desplegar en Kubernetes.

## 🚀 Tecnologías principales

- **Frontend:** Next.js + Tailwind CSS
- **Backend (Microservicios):**
  - **Auth Service** - Autenticación y JWT (Node.js + Express + MongoDB)
  - **Booking Service** - Gestión de reservas (Node.js + Express + **GraphQL** + **PostgreSQL**)
  - **User Service** - Gestión de usuarios (Node.js + Express + MongoDB)
  - **Notification Service** - Notificaciones por email (Node.js + Express + Nodemailer)
- **Bases de datos:** 
  - MongoDB (auth-service, user-service)
  - **PostgreSQL** (booking-service)
- **API:** REST + **GraphQL**
- **Autenticación:** JSON Web Tokens (JWT)
- **Contenedores:** Docker + Docker Compose
- **Orquestación:** Kubernetes (StatefulSets, Deployments, ConfigMaps, Secrets)

---

## 📁 Estructura de carpetas

```plaintext
/app-reservas
├── frontend/                # Next.js App (UI del sistema)
├── auth-service/            # Servicio de autenticación (REST API)
├── user-service/            # Servicio de usuarios (REST API)
├── booking-service/         # ⭐ Servicio de reservas (GraphQL + PostgreSQL)
│   ├── src/
│   │   ├── graphql/         # Schema GraphQL (typeDefs + resolvers)
│   │   ├── services/        # Lógica de negocio
│   │   ├── repositories/    # Capa de acceso a datos
│   │   ├── models/          # Modelos Sequelize
│   │   ├── adapters/        # Clientes para otros microservicios
│   │   ├── migrations/      # Migraciones de BD
│   │   └── config/          # Configuración
│   ├── __tests__/           # Tests unitarios e integración
│   ├── README.md            # Documentación completa del servicio
│   ├── GRAPHQL_EXAMPLES.md  # Ejemplos de operaciones GraphQL
│   └── postman_collection.json
├── notification-service/    # Servicio de notificaciones por email
├── k8s/                     # ⭐ Manifiestos de Kubernetes
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── secret.yaml
│   ├── postgres.yaml        # StatefulSet + PVC para PostgreSQL
│   ├── deployment.yaml      # Deployment + Service del booking-service
│   └── README.md
└── docker-compose.yml       # Orquestación local de todos los servicios
```

---

## ⚙️ Variables de entorno

### 📝 Frontend (frontend/.env.production.local)

```bash
NEXT_PUBLIC_API_URL=/api/auth
NEXT_PUBLIC_BOOKING_URL=/api/bookings
NEXT_PUBLIC_USER_URL=/api/users
```

### 🔐 Backend - Auth Service (auth-service/.env)

```bash
PORT=4000
MONGO_URI=mongodb://mongo:27017/authdb
JWT_SECRET=secreto-super-seguro
```

### 🔐 Backend - User Service (user-service/.env)

```bash
PORT=5003
MONGO_URI=mongodb://mongo:27017/user-service-db
JWT_SECRET=secreto-super-seguro
```

### ⭐ Backend - Booking Service (booking-service/.env)

```bash
# Puerto del servicio
PORT=5000

# PostgreSQL (Base de datos relacional)
DB_HOST=postgres
DB_PORT=5432
DB_NAME=bookingdb
DB_USER=booking
DB_PASSWORD=booking123

# JWT (mismo secret que otros servicios)
JWT_SECRET=secreto-super-seguro

# URLs de microservicios
USER_SERVICE_URL=http://user-service:5003
NOTIFICATION_SERVICE_URL=http://notification-service:5002
```

### 🔐 Backend - Notification Service (notification-service/.env)

```bash
PORT=5002
EMAIL_HOST=sandbox.smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_USER=tu-usuario-mailtrap
EMAIL_PASS=tu-password-mailtrap
```

### 📋 Resumen de Variables Clave

| Variable | Descripción | Servicios |
|----------|-------------|-----------|
| `JWT_SECRET` | Secret para firmar/verificar tokens JWT | Todos los backend services |
| `MONGO_URI` | Conexión a MongoDB | auth-service, user-service |
| `DB_*` | Configuración PostgreSQL | booking-service |
| `*_SERVICE_URL` | URLs de comunicación entre servicios | booking-service |

---

## 🐳 Ejecución Local con Docker Compose

### Opción 1: Todos los servicios

```bash
# 1. Clonar el repositorio
git clone <tu-repositorio>
cd app-reservas

# 2. Construir los contenedores
docker-compose build

# 3. Levantar todos los servicios
docker-compose up -d

# 4. Verificar que todos están corriendo
docker-compose ps

# 5. Ver logs
docker-compose logs -f booking-service

# 6. Aplicar migraciones de booking-service (primera vez)
docker-compose exec booking-service npm run db:migrate
```

**Servicios disponibles:**
- Frontend: http://localhost:3000
- Auth Service: http://localhost:4000
- Booking Service (GraphQL): http://localhost:5000/graphql
- Notification Service: http://localhost:5002
- User Service: http://localhost:5003
- PostgreSQL: localhost:5433 (mapeado desde 5432)
- MongoDB: localhost:27017

### Opción 2: Solo Booking Service + PostgreSQL (Recomendado para desarrollo)

```bash
# Levantar solo booking-service y su base de datos
docker-compose up -d postgres booking-service

# Aplicar migraciones
docker-compose exec booking-service npm run db:migrate

# Acceder a GraphQL Playground
# Abrir: http://localhost:5000/graphql
```

### Comandos Útiles

```bash
# Detener servicios
docker-compose down

# Detener y eliminar volúmenes (borra datos de BD)
docker-compose down -v

# Reconstruir un servicio específico
docker-compose build booking-service
docker-compose up -d booking-service

# Ejecutar comandos dentro de un contenedor
docker-compose exec booking-service npm test
docker-compose exec postgres psql -U booking -d bookingdb
```

---

## ☸️ Despliegue en Kubernetes

### Requisitos Previos

- Cluster de Kubernetes activo (Minikube, Docker Desktop, GKE, EKS, etc.)
- `kubectl` instalado y configurado
- Imágenes Docker construidas

### Paso 1: Construir Imagen del Booking Service

```bash
cd booking-service
docker build -t booking-service:latest .

# Si usas un registry remoto:
# docker tag booking-service:latest tu-registry/booking-service:latest
# docker push tu-registry/booking-service:latest
```

### Paso 2: Desplegar Manifiestos

```bash
# Desde la raíz del proyecto
cd k8s

# Opción A: Aplicar todos los manifiestos a la vez
kubectl apply -f .

# Opción B: Aplicar en orden específico (recomendado)
kubectl apply -f namespace.yaml
kubectl apply -f secret.yaml
kubectl apply -f configmap.yaml
kubectl apply -f postgres.yaml

# Esperar a que PostgreSQL esté listo
kubectl wait --for=condition=ready pod -l app=postgres -n booking --timeout=120s

# Desplegar booking-service
kubectl apply -f deployment.yaml
```

### Paso 3: Aplicar Migraciones

```bash
# Obtener nombre del pod
POD=$(kubectl get pod -n booking -l app=booking-service -o jsonpath="{.items[0].metadata.name}")

# Ejecutar migraciones
kubectl exec -n booking $POD -- npm run db:migrate

# Verificar que las migraciones se aplicaron
kubectl exec -n booking $POD -- npm run db:migrate:status
```

### Paso 4: Verificar Despliegue

```bash
# Ver todos los recursos
kubectl get all -n booking

# Ver logs del booking-service
kubectl logs -n booking -l app=booking-service -f

# Verificar healthchecks
kubectl get pods -n booking
# STATUS debe ser "Running" y READY debe ser "1/1"

# Probar conectividad
kubectl exec -n booking $POD -- curl -s http://localhost:5000/health
```

### Paso 5: Acceder al Servicio

```bash
# Port forwarding para acceso local
kubectl port-forward -n booking svc/booking-service 5000:5000

# Ahora puedes acceder a:
# http://localhost:5000/graphql
```

### Estructura de Recursos en Kubernetes

| Recurso | Tipo | Descripción |
|---------|------|-------------|
| `booking` | Namespace | Aísla todos los recursos del sistema |
| `booking-secrets` | Secret | Contiene DB_PASSWORD y JWT_SECRET |
| `booking-config` | ConfigMap | Variables de entorno no sensibles |
| `postgres` | StatefulSet | Base de datos PostgreSQL con persistencia |
| `postgres-service` | Service (Headless) | Acceso a PostgreSQL dentro del cluster |
| `postgres-data` | PVC | Volumen persistente de 1Gi para datos |
| `booking-service` | Deployment | 2 réplicas del servicio GraphQL |
| `booking-service` | Service (ClusterIP) | Expone el servicio en el puerto 5000 |

### Healthchecks Configurados

```yaml
# Liveness Probe - Reinicia el pod si falla
livenessProbe:
  httpGet:
    path: /health
    port: 5000
  initialDelaySeconds: 15
  periodSeconds: 20

# Readiness Probe - Quita del Service si no está listo
readinessProbe:
  httpGet:
    path: /ready
    port: 5000
  initialDelaySeconds: 5
  periodSeconds: 10
```

### Escalado

```bash
# Escalar a 3 réplicas
kubectl scale deployment booking-service -n booking --replicas=3

# Autoescalado (requiere metrics-server)
kubectl autoscale deployment booking-service -n booking \
  --cpu-percent=70 --min=2 --max=5
```

### Actualización de la Aplicación

```bash
# 1. Construir nueva imagen con tag versionado
docker build -t booking-service:v2 booking-service/

# 2. Actualizar imagen en deployment
kubectl set image deployment/booking-service \
  booking-service=booking-service:v2 -n booking

# 3. Verificar rollout
kubectl rollout status deployment/booking-service -n booking

# 4. Si algo falla, rollback
kubectl rollout undo deployment/booking-service -n booking
```

### Troubleshooting

```bash
# Ver eventos del namespace
kubectl get events -n booking --sort-by='.lastTimestamp'

# Describir un pod con problemas
kubectl describe pod <pod-name> -n booking

# Ver logs completos
kubectl logs -n booking <pod-name> --previous  # logs del contenedor anterior

# Conectarse al pod para debugging
kubectl exec -it -n booking <pod-name> -- /bin/sh

# Verificar conectividad a PostgreSQL
kubectl exec -n booking <pod-name> -- nc -zv postgres-service 5432
```

### Limpieza

```bash
# Eliminar todos los recursos
kubectl delete namespace booking

# O eliminar recursos específicos
kubectl delete -f k8s/
```

---

## 📖 Operaciones GraphQL del Booking Service

### Autenticación

Todas las operaciones GraphQL requieren un token JWT:

```bash
# 1. Registrar usuario en auth-service
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Juan Pérez",
    "email": "juan@example.com",
    "password": "password123"
  }'

# 2. Iniciar sesión y obtener token
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "juan@example.com",
    "password": "password123"
  }'
# Respuesta: { "token": "eyJhbGc..." }

# 3. Usar token en headers de GraphQL
Authorization: Bearer eyJhbGc...
```

### Ejemplos de Queries y Mutations

#### 1. Crear Reserva

```graphql
mutation {
  createBooking(
    fecha: "2026-03-15T10:00:00"
    servicio: "Hotel Paradise - Suite Ejecutiva"
  ) {
    id
    servicio
    estado
    fechaFormateada
  }
}
```

#### 2. Listar Todas las Reservas

```graphql
query {
  bookings {
    id
    servicio
    estado
    fecha
    fechaFormateada
    canceladaEn
  }
}
```

#### 3. Listar Próximas Reservas

```graphql
query {
  upcomingBookings {
    id
    servicio
    fechaFormateada
  }
}
```

#### 4. Cancelar Reserva

```graphql
mutation {
  cancelBooking(id: "tu-booking-id") {
    message
    booking {
      id
      estado
      canceladaEn
    }
  }
}
```

#### 5. Eliminar Reserva

```graphql
mutation {
  deleteBooking(id: "tu-booking-id") {
    message
  }
}
```

### Usando curl

```bash
# Crear reserva
curl -X POST http://localhost:5000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -d '{
    "query": "mutation { createBooking(fecha: \"2026-03-15T10:00:00\", servicio: \"Hotel Test\") { id servicio estado } }"
  }'

# Listar reservas
curl -X POST http://localhost:5000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -d '{"query": "query { bookings { id servicio estado } }"}'
```

### GraphQL Playground

Abrir en navegador: http://localhost:5000/graphql

El playground incluye:
- ✅ Autocompletado
- ✅ Documentación interactiva del schema
- ✅ Configuración de headers (para Authorization)

### Documentación Completa

Ver ejemplos detallados y casos de uso en:
- [`booking-service/README.md`](./booking-service/README.md)
- [`booking-service/GRAPHQL_EXAMPLES.md`](./booking-service/GRAPHQL_EXAMPLES.md)
- [`booking-service/postman_collection.json`](./booking-service/postman_collection.json) - Colección importable

---

## 🔐 Validación de Usuario con User Service

El booking-service **delega la autenticación** al user-service para validar que cada petición proviene de un usuario válido.

### Flujo de Validación

```
┌─────────┐         ┌──────────────────┐         ┌──────────────┐
│ Cliente │────1───▶│ Booking Service  │────2───▶│ User Service │
│         │         │  (GraphQL API)   │         │   (REST)     │
└─────────┘         └──────────────────┘         └──────────────┘
     ▲                       │                           │
     │                       │                           │
     └───────────4───────────┘◀──────────3───────────────┘

1. Cliente envía GraphQL request con header: Authorization: Bearer <jwt>
2. Booking service llama a GET /users/me del user-service con el token
3. User-service valida JWT y retorna datos del usuario: { _id, nombre, email }
4. Booking service usa el userId para crear/consultar reservas
```

### Implementación

**Código en `booking-service/src/adapters/userService.adapter.js`:**

```javascript
class UserServiceAdapter {
  async verifyUser(token) {
    try {
      const response = await axios.get(
        `${USER_SERVICE_URL}/users/me`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data; // { _id, nombre, email }
    } catch (error) {
      if (error.response?.status === 401) {
        throw new Error('Usuario no autenticado o token inválido');
      }
      throw new Error('Error al verificar usuario con user-service');
    }
  }
}
```

**Uso en Service Layer:**

```javascript
// src/services/booking.service.js
async createBooking({ fecha, servicio }, token) {
  // 1. Validar usuario
  const user = await userServiceAdapter.verifyUser(token);
  
  // 2. Crear reserva con userId validado
  const booking = await bookingRepository.create({
    userId: user._id,
    fecha,
    servicio,
    estado: 'activo'
  });
  
  return booking;
}
```

### Ventajas de esta Arquitectura

- ✅ **Separación de responsabilidades:** Booking service no maneja autenticación
- ✅ **Consistencia:** Un solo punto de validación de usuarios
- ✅ **Seguridad:** Tokens verificados en tiempo real
- ✅ **Escalabilidad:** Servicios independientes

---

## 📏 Reglas de Negocio

### 1. Máximo 5 Reservas Canceladas por Usuario

**Descripción:** Cuando un usuario cancela una reserva, el sistema mantiene un máximo de 5 reservas canceladas. Si ya existen 5 o más, las más antiguas se eliminan automáticamente.

**Garantía ACID:** Implementado con transacciones de PostgreSQL

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

**Propiedades ACID:**
- ✅ **Atomicidad:** Cancelación + limpieza ocurren juntas o no ocurren
- ✅ **Consistencia:** Siempre ≤ 5 reservas canceladas por usuario
- ✅ **Aislamiento:** Locks evitan condiciones de carrera
- ✅ **Durabilidad:** Cambios persistidos en PostgreSQL

**Prueba manual:**

```bash
# 1. Crear 7 reservas
for i in {1..7}; do
  curl -X POST http://localhost:5000/graphql \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"query\": \"mutation { createBooking(fecha: \\\"2026-0$((i+2))-15T10:00:00\\\", servicio: \\\"Hotel $i\\\") { id } }\"}"
done

# 2. Obtener IDs y cancelar todas
curl -X POST http://localhost:5000/graphql \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"query": "query { bookings { id } }"}'

# 3. Verificar que solo quedan 5 canceladas
curl -X POST http://localhost:5000/graphql \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"query": "query { bookings { estado } }"}'
```

### 2. Solo Próximas Reservas Activas

La query `upcomingBookings` filtra automáticamente:
- Estado = "activo"
- Fecha >= HOY
- Ordenadas por fecha ascendente
- Máximo 5 resultados

---

## 🧪 Pruebas

### Ejecutar Tests del Booking Service

```bash
cd booking-service

# Tests unitarios + integración
npm test

# Tests con reporte de cobertura
npm test -- --coverage

# Tests en modo watch
npm run test:watch
```

### Cobertura de Tests

```
PASS  __tests__/unit/booking.repository.test.js
  ✓ should create a booking
  ✓ should find bookings by userId
  ✓ should cancel and purge (ACID)
  ✓ should keep maximum 5 cancelled bookings

PASS  __tests__/unit/booking.service.test.js
  ✓ should create booking and notify
  ✓ should verify user before creating
  ✓ should enforce business rules

PASS  __tests__/integration/graphql.test.js
  ✓ should execute GraphQL queries
  ✓ should handle mutations correctly
  ✓ should validate authentication

----------------------|---------|----------|---------|---------|
File                  | % Stmts | % Branch | % Funcs | % Lines |
----------------------|---------|----------|---------|---------|
All files             |   85.2  |   78.4   |   88.1  |   86.3  |
 repositories         |   92.1  |   85.7   |   95.2  |   93.4  |
 services             |   86.3  |   76.9   |   90.1  |   87.8  |
 graphql              |   81.5  |   72.3   |   80.0  |   82.1  |
----------------------|---------|----------|---------|---------|
```

### Tests de Regla de Negocio

Ver archivo: `booking-service/__tests__/unit/booking.repository.test.js`

Incluye:
- ✅ Transacciones ACID
- ✅ Límite de 5 reservas canceladas
- ✅ Rollback en caso de error
- ✅ Condiciones de carrera (race conditions)

---

## ✅ Funcionalidades principales

- ✅ Registro e inicio de sesión de usuarios
- ✅ Perfil editable
- ✅ **Creación de reservas vía GraphQL**
- ✅ **Cancelación con transacciones ACID**
- ✅ Historial de reservas activas y canceladas
- ✅ **Límite automático de 5 reservas canceladas**
- ✅ **Listado de próximas reservas (fecha >= hoy)**
- ✅ Notificaciones por email (reserva y cancelación)
- ✅ **Validación de usuarios con user-service**
- ✅ **Persistencia relacional con PostgreSQL**
- ✅ Gestión de microservicios independientes
- ✅ **Despliegue en Kubernetes con StatefulSets**
- ✅ **Healthchecks (liveness/readiness probes)**
- ✅ **Tests unitarios e integración (Jest)**

---

## 📚 Documentación Adicional

### Por Servicio

- **Booking Service (Completo):**
  - [README principal](./booking-service/README.md)
  - [Ejemplos GraphQL](./booking-service/GRAPHQL_EXAMPLES.md)
  - [Colección Postman](./booking-service/postman_collection.json)
  
- **Kubernetes:**
  - [Guía de despliegue](./k8s/README.md)

### Esquema de Base de Datos

**PostgreSQL (booking-service):**
```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  fecha TIMESTAMP NOT NULL,
  servicio VARCHAR(255) NOT NULL,
  estado ENUM('activo', 'cancelada') DEFAULT 'activo',
  cancelada_en TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_estado ON bookings(estado);
CREATE INDEX idx_bookings_fecha ON bookings(fecha);
```

**Migraciones:**
- Ver: `booking-service/src/migrations/20260209000001-create-bookings.js`

### 3. 🐳 Uso con Docker

1. Construir los contenedores

```bash
docker-compose build
```

3. Levantar los servicios

```bash
docker-compose up
```

La app estará disponible en http://localhost:3000
