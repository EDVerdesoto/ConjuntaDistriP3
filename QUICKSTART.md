# 🚀 Quick Start Guide - Booking Service

Guía rápida para poner en marcha el booking-service en menos de 5 minutos.

---

## ⚡ Ejecución Local (Docker Compose)

```bash
# 1. Levantar servicios
docker-compose up -d postgres booking-service

# 2. Aplicar migraciones (esperar 10 segundos para que PostgreSQL inicie)
sleep 10
docker-compose exec booking-service npm run db:migrate

# 3. Ver logs
docker-compose logs -f booking-service

# 4. Abrir GraphQL Playground
# http://localhost:5000/graphql
```

**✅ Listo!** El servicio está corriendo en http://localhost:5000

---

## ☸️ Despliegue en Kubernetes

```bash
# 1. Construir imagen (solo primera vez)
cd booking-service
docker build -t booking-service:latest .
cd ..

# 2. Aplicar manifiestos
kubectl apply -f k8s/

# 3. Esperar a que esté listo
kubectl wait --for=condition=ready pod --all -n booking --timeout=180s

# 4. Aplicar migraciones
POD=$(kubectl get pod -n booking -l app=booking-service -o jsonpath="{.items[0].metadata.name}")
kubectl exec -n booking $POD -- npm run db:migrate

# 5. Port forward
kubectl port-forward -n booking svc/booking-service 5000:5000

# 6. Abrir GraphQL Playground
# http://localhost:5000/graphql
```

**✅ Listo!** El servicio está desplegado en Kubernetes

---

## 🧪 Ejecutar Tests

```bash
cd booking-service

# Todos los tests
npm test

# Con cobertura
npm test -- --coverage
```

---

## 📝 Probar GraphQL API

### 1. Obtener Token JWT

```bash
# Registrar usuario
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Test","email":"test@example.com","password":"pass123"}'

# Login
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass123"}'

# Copiar el token de la respuesta
```

### 2. Crear Reserva

```bash
curl -X POST http://localhost:5000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -d '{
    "query": "mutation { createBooking(fecha: \"2026-03-15T10:00:00\", servicio: \"Hotel Paradise\") { id servicio estado } }"
  }'
```

### 3. Listar Reservas

```bash
curl -X POST http://localhost:5000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -d '{"query": "query { bookings { id servicio estado } }"}'
```

### 4. O usar GraphQL Playground

Abrir: http://localhost:5000/graphql

Configurar header:
```json
{
  "Authorization": "Bearer TU_TOKEN_AQUI"
}
```

Ejecutar query:
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

---

## 📦 Importar Colección Postman

1. Abrir Postman
2. Click en "Import"
3. Seleccionar `booking-service/postman_collection.json`
4. En "Auth" → "Login usuario" → Send (obtener token automáticamente)
5. Probar todas las operaciones

---

## 📚 Documentación Completa

- **Proyecto completo:** [`README.md`](./README.md)
- **Booking service:** [`booking-service/README.md`](./booking-service/README.md)
- **Ejemplos GraphQL:** [`booking-service/GRAPHQL_EXAMPLES.md`](./booking-service/GRAPHQL_EXAMPLES.md)
- **Kubernetes:** [`k8s/README.md`](./k8s/README.md)
- **Entregables:** [`ENTREGABLES.md`](./ENTREGABLES.md)

---

## 🔧 Comandos Útiles

### Docker Compose

```bash
# Ver logs
docker-compose logs -f booking-service

# Reiniciar servicio
docker-compose restart booking-service

# Detener todo
docker-compose down

# Eliminar volúmenes (borra datos)
docker-compose down -v
```

### Kubernetes

```bash
# Ver pods
kubectl get pods -n booking

# Ver logs
kubectl logs -n booking -l app=booking-service -f

# Eliminar todo
kubectl delete namespace booking
```

### Tests

```bash
# Watch mode (desarrollo)
npm run test:watch

# Un test específico
npm test -- booking.repository.test
```

---

## ❓ Troubleshooting Rápido

### No se conecta a PostgreSQL
```bash
# Esperar 10 segundos más
sleep 10

# Ver logs de PostgreSQL
docker-compose logs postgres
```

### Token inválido
```bash
# Obtener nuevo token
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass123"}'
```

### Migraciones fallan
```bash
# Verificar que PostgreSQL está listo
docker-compose exec postgres pg_isready -U booking

# Intentar de nuevo
docker-compose exec booking-service npm run db:migrate
```

---

**¿Más ayuda?** Ver la documentación completa en los archivos README listados arriba.
