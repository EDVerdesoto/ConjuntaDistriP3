# ☸️ Kubernetes Deployment - Sistema Completo de Reservas

Esta carpeta contiene todos los manifiestos necesarios para desplegar el **sistema completo** de reservas en Kubernetes, incluyendo:

- 🎨 Frontend (Next.js)
- 🔐 Auth Service (REST + MongoDB)
- 👤 User Service (REST + MongoDB)
- 📅 Booking Service (GraphQL + PostgreSQL)
- 📧 Notification Service (REST + Email)
- 🗄️ MongoDB (StatefulSet)
- 🐘 PostgreSQL (StatefulSet)

---

## 📋 Tabla de Contenidos

- [Recursos Incluidos](#-recursos-incluidos)
- [Requisitos Previos](#-requisitos-previos)
- [Despliegue Rápido](#-despliegue-rápido)
- [Despliegue Manual](#-despliegue-manual)
- [Acceso a los Servicios](#-acceso-a-los-servicios)
- [Verificación](#-verificación)
- [Troubleshooting](#-troubleshooting)

---

## 📦 Recursos Incluidos

### Manifiestos

| Archivo | Servicios | Descripción |
|---------|-----------|-------------|
| `namespace.yaml` | - | Namespace `booking` |
| `secret.yaml` | All | JWT_SECRET, DB_PASSWORD |
| `configmap.yaml` | booking-service | Variables de entorno |
| `mongodb.yaml` | auth, user | MongoDB StatefulSet + PVC (2Gi) |
| `postgres.yaml` | booking | PostgreSQL StatefulSet + PVC (1Gi) |
| `auth-service.yaml` | auth | Deployment (2 réplicas) + Service |
| `user-service.yaml` | user | Deployment (2 réplicas) + Service |
| `booking-service.yaml` (deployment.yaml) | booking | Deployment (2 réplicas) + Service |
| `notification-service.yaml` | notification | Deployment (2 réplicas) + Service + ConfigMap/Secret |
| `frontend.yaml` | frontend | Deployment (2 réplicas) + LoadBalancer Service |
| `ingress.yaml` | All | Ingress para enrutar tráfico HTTP |

### Scripts de Automatización

| Script | Descripción |
|--------|-------------|
| `build-images.sh` | Construye todas las imágenes Docker |
| `deploy.sh` | Despliega todo el sistema automáticamente |
| `undeploy.sh` | Elimina todos los recursos |

---

## ✅ Requisitos Previos

1. **Cluster de Kubernetes activo:**
   ```bash
   kubectl cluster-info
   ```

2. **kubectl instalado:**
   ```bash
   kubectl version --client
   ```

3. **Contexto configurado:**
   ```bash
   kubectl config current-context
   ```

4. **Para Minikube (opcional):**
   ```bash
   minikube start --cpus=4 --memory=8192
   minikube addons enable ingress
   ```

---

## 🚀 Despliegue Rápido

### Opción 1: Script Automatizado (Recomendado)

```bash
# 1. Construir imágenes Docker
chmod +x build-images.sh deploy.sh undeploy.sh
./build-images.sh

# 2. Desplegar todo
./deploy.sh
```

**¡Listo!** Todo el sistema estará desplegado en ~3 minutos.

### Opción 2: Kubectl Apply

```bash
# Aplicar todos los manifiestos
kubectl apply -f .

# Esperar a que todo esté listo
kubectl wait --for=condition=ready pod --all -n booking --timeout=300s

# Aplicar migraciones de booking-service
POD=$(kubectl get pod -n booking -l app=booking-service -o jsonpath="{.items[0].metadata.name}")
kubectl exec -n booking $POD -- npm run db:migrate
```

---

## 📝 Despliegue Manual
- [Verificación](#-verificación)
- [Acceso al Servicio](#-acceso-al-servicio)
- [Migraciones de Base de Datos](#-migraciones-de-base-de-datos)
- [Monitoreo y Logs](#-monitoreo-y-logs)
- [Escalado](#-escalado)
- [Actualización](#-actualización)
- [Troubleshooting](#-troubleshooting)
- [Limpieza](#-limpieza)

---

## 📦 Recursos Incluidos

| Archivo | Tipo | Descripción |
|---------|------|-------------|
| `namespace.yaml` | Namespace | Aísla todos los recursos en el namespace `booking` |
| `secret.yaml` | Secret | Contiene credenciales sensibles (DB_PASSWORD, JWT_SECRET) |
| `configmap.yaml` | ConfigMap | Variables de entorno no sensibles |
| `postgres.yaml` | StatefulSet + Service + PVC | PostgreSQL 16 con persistencia |
| `deployment.yaml` | Deployment + Service | Booking service (GraphQL) con 2 réplicas |

### Detalles de Recursos

#### 1. Namespace
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: booking
```

#### 2. Secret (booking-secrets)
- `DB_PASSWORD`: Contraseña de PostgreSQL
- `JWT_SECRET`: Secret para validación de tokens JWT

#### 3. ConfigMap (booking-config)
- `PORT`: 5000
- `DB_HOST`: postgres-service
- `DB_PORT`: 5432
- `DB_NAME`: bookingdb
- `DB_USER`: booking
- `USER_SERVICE_URL`: http://user-service.booking.svc.cluster.local:5003
- `NOTIFICATION_SERVICE_URL`: http://notification-service.booking.svc.cluster.local:5002

#### 4. PostgreSQL StatefulSet
- **Imagen:** postgres:16-alpine
- **Réplicas:** 1
- **Persistencia:** PVC de 1Gi
- **Healthchecks:** Readiness + Liveness con `pg_isready`
- **Service:** Headless (ClusterIP: None) para acceso estable

#### 5. Booking Service Deployment
- **Imagen:** booking-service:latest
- **Réplicas:** 2 (alta disponibilidad)
- **Healthchecks:**
  - Liveness: `/health` (verifica app + DB)
  - Readiness: `/ready` (verifica que está listo para tráfico)
- **Recursos:**
  - Requests: 128Mi RAM, 100m CPU
  - Limits: 256Mi RAM, 250m CPU
- **Service:** ClusterIP en puerto 5000

---

## ✅ Requisitos Previos

1. **Cluster de Kubernetes activo:**
   ```bash
   kubectl cluster-info
   ```

2. **kubectl instalado y configurado:**
   ```bash
   kubectl version --client
   ```

3. **Imagen Docker del booking-service:**
   ```bash
   cd ../booking-service
   docker build -t booking-service:latest .
   
   # Si usas Minikube:
   eval $(minikube docker-env)
   docker build -t booking-service:latest .
   
   # Si usas un registry remoto:
   docker tag booking-service:latest tu-registry/booking-service:latest
   docker push tu-registry/booking-service:latest
   ```

---

## 🚀 Despliegue Rápido

```bash
# Desde la raíz del proyecto
cd k8s

# Aplicar todos los manifiestos
kubectl apply -f .

# Esperar a que todos los pods estén listos
kubectl wait --for=condition=ready pod --all -n booking --timeout=180s

# Aplicar migraciones
POD=$(kubectl get pod -n booking -l app=booking-service -o jsonpath="{.items[0].metadata.name}")
kubectl exec -n booking $POD -- npm run db:migrate
```

---

## 📝 Despliegue Paso a Paso

### 1. Crear Namespace

```bash
kubectl apply -f namespace.yaml
```

**Verificar:**
```bash
kubectl get namespace booking
```

### 2. Crear Secret

```bash
kubectl apply -f secret.yaml
```

**Verificar:**
```bash
kubectl get secret booking-secrets -n booking
kubectl describe secret booking-secrets -n booking
```

**⚠️ IMPORTANTE:** En producción, **NO** uses `stringData` en el YAML. Usa:
```bash
kubectl create secret generic booking-secrets -n booking \
  --from-literal=DB_PASSWORD='tu-password-seguro' \
  --from-literal=JWT_SECRET='tu-secret-seguro-aleatorio'
```

### 3. Crear ConfigMap

```bash
kubectl apply -f configmap.yaml
```

**Verificar:**
```bash
kubectl get configmap booking-config -n booking -o yaml
```

### 4. Desplegar PostgreSQL

```bash
kubectl apply -f postgres.yaml
```

**Verificar:**
```bash
# Ver pod de PostgreSQL
kubectl get statefulset postgres -n booking
kubectl get pods -n booking -l app=postgres

# Esperar a que esté listo
kubectl wait --for=condition=ready pod -l app=postgres -n booking --timeout=120s

# Verificar PVC
kubectl get pvc -n booking

# Ver logs
kubectl logs -n booking postgres-0
```

**Probar conectividad:**
```bash
kubectl exec -n booking postgres-0 -- pg_isready -U booking
# Salida esperada: postgres-0:5432 - accepting connections
```

### 5. Desplegar Booking Service

```bash
kubectl apply -f deployment.yaml
```

**Verificar:**
```bash
# Ver deployment
kubectl get deployment booking-service -n booking

# Ver pods
kubectl get pods -n booking -l app=booking-service

# Esperar a que estén ready
kubectl wait --for=condition=ready pod -l app=booking-service -n booking --timeout=120s

# Ver service
kubectl get svc booking-service -n booking
```

### 6. Aplicar Migraciones

```bash
# Obtener nombre del pod
POD=$(kubectl get pod -n booking -l app=booking-service -o jsonpath="{.items[0].metadata.name}")

echo "Pod seleccionado: $POD"

# Ejecutar migraciones
kubectl exec -n booking $POD -- npm run db:migrate

# Verificar estado de migraciones
kubectl exec -n booking $POD -- npm run db:migrate:status
```

**Salida esperada:**
```
Sequelize CLI [Node: 18.x.x]

Loaded configuration file "src/config/database.json".
Using environment "development".

== 20260209000001-create-bookings: migrated (0.234s)
```

---

## ✔️ Verificación

### Ver Todos los Recursos

```bash
kubectl get all -n booking
```

**Salida esperada:**
```
NAME                                   READY   STATUS    RESTARTS   AGE
pod/booking-service-xxxxxxxxxx-xxxxx   1/1     Running   0          2m
pod/booking-service-xxxxxxxxxx-xxxxx   1/1     Running   0          2m
pod/postgres-0                         1/1     Running   0          3m

NAME                      TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)    AGE
service/booking-service   ClusterIP   10.96.xxx.xxx   <none>        5000/TCP   2m
service/postgres-service  ClusterIP   None            <none>        5432/TCP   3m

NAME                              READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/booking-service   2/2     2            2           2m

NAME                         READY   AGE
statefulset.apps/postgres    1/1     3m
```

### Verificar Healthchecks

```bash
POD=$(kubectl get pod -n booking -l app=booking-service -o jsonpath="{.items[0].metadata.name}")

# Liveness probe
kubectl exec -n booking $POD -- curl -s http://localhost:5000/health
# Esperado: {"status":"ok","db":"connected"}

# Readiness probe
kubectl exec -n booking $POD -- curl -s http://localhost:5000/ready
# Esperado: {"status":"ready"}
```

### Ver Logs

```bash
# Logs de booking-service (todas las réplicas)
kubectl logs -n booking -l app=booking-service -f

# Logs de PostgreSQL
kubectl logs -n booking postgres-0 -f

# Logs de un pod específico
kubectl logs -n booking <pod-name> --tail=100
```

---

## 🌐 Acceso al Servicio

### Opción 1: Port Forwarding (Desarrollo)

```bash
kubectl port-forward -n booking svc/booking-service 5000:5000
```

Ahora puedes acceder a:
- **GraphQL Playground:** http://localhost:5000/graphql
- **Health endpoint:** http://localhost:5000/health

### Opción 2: Crear un LoadBalancer (Cloud)

```bash
kubectl patch svc booking-service -n booking -p '{"spec":{"type":"LoadBalancer"}}'

# Obtener IP externa
kubectl get svc booking-service -n booking
```

### Opción 3: Ingress (Recomendado para producción)

Crear archivo `ingress.yaml`:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: booking-ingress
  namespace: booking
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
    - host: booking.tu-dominio.com
      http:
        paths:
          - path: /graphql
            pathType: Prefix
            backend:
              service:
                name: booking-service
                port:
                  number: 5000
```

```bash
kubectl apply -f ingress.yaml
```

---

## 🗄️ Migraciones de Base de Datos

### Aplicar Migraciones

```bash
POD=$(kubectl get pod -n booking -l app=booking-service -o jsonpath="{.items[0].metadata.name}")
kubectl exec -n booking $POD -- npm run db:migrate
```

### Ver Estado de Migraciones

```bash
kubectl exec -n booking $POD -- npm run db:migrate:status
```

### Revertir Última Migración

```bash
kubectl exec -n booking $POD -- npm run db:migrate:undo
```

### Crear Nueva Migración

```bash
# Desde local (luego reconstruir imagen)
cd booking-service
npm run sequelize-cli migration:generate -- --name nombre-migracion

# Editar el archivo generado en src/migrations/
# Reconstruir imagen y redesplegar
```

### Backup de Base de Datos

```bash
# Dump de la base de datos
kubectl exec -n booking postgres-0 -- pg_dump -U booking bookingdb > backup.sql

# Restaurar desde backup
kubectl exec -i -n booking postgres-0 -- psql -U booking bookingdb < backup.sql
```

---

## 📊 Monitoreo y Logs

### Ver Estado de Pods

```bash
# Estado general
kubectl get pods -n booking

# Detalles de un pod
kubectl describe pod <pod-name> -n booking

# Top (requiere metrics-server)
kubectl top pod -n booking
kubectl top node
```

### Ver Eventos

```bash
# Eventos recientes del namespace
kubectl get events -n booking --sort-by='.lastTimestamp'

# Eventos de un pod específico
kubectl describe pod <pod-name> -n booking | grep -A 10 Events
```

### Logs Avanzados

```bash
# Logs en tiempo real de todos los pods de booking-service
kubectl logs -n booking -l app=booking-service -f --tail=50

# Logs del contenedor anterior (si crasheó)
kubectl logs -n booking <pod-name> --previous

# Logs con timestamps
kubectl logs -n booking <pod-name> --timestamps=true

# Logs de los últimos 30 minutos
kubectl logs -n booking <pod-name> --since=30m
```

### Conectarse al Pod para Debugging

```bash
# Shell interactivo
kubectl exec -it -n booking <pod-name> -- /bin/sh

# Ejecutar comando directo
kubectl exec -n booking <pod-name> -- env
kubectl exec -n booking <pod-name> -- ps aux
kubectl exec -n booking <pod-name> -- netstat -tulpn
```

### Verificar Conectividad

```bash
# Desde booking-service a PostgreSQL
kubectl exec -n booking <booking-pod> -- nc -zv postgres-service 5432

# Desde booking-service a user-service (si está en K8s)
kubectl exec -n booking <booking-pod> -- curl -s http://user-service.booking.svc.cluster.local:5003/health
```

---

## 📈 Escalado

### Escalado Manual

```bash
# Escalar a 3 réplicas
kubectl scale deployment booking-service -n booking --replicas=3

# Verificar
kubectl get pods -n booking -l app=booking-service
```

### Autoescalado (HPA)

Requiere `metrics-server` instalado:

```bash
# Crear HPA
kubectl autoscale deployment booking-service -n booking \
  --cpu-percent=70 \
  --min=2 \
  --max=5

# Ver estado del HPA
kubectl get hpa -n booking

# Detalles
kubectl describe hpa booking-service -n booking
```

**O usando YAML:**

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: booking-service-hpa
  namespace: booking
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: booking-service
  minReplicas: 2
  maxReplicas: 5
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

---

## 🔄 Actualización

### Actualizar Imagen

```bash
# 1. Construir nueva imagen con tag versionado
cd ../booking-service
docker build -t booking-service:v2.0 .

# 2. Actualizar deployment
kubectl set image deployment/booking-service \
  booking-service=booking-service:v2.0 -n booking

# 3. Ver progreso del rollout
kubectl rollout status deployment/booking-service -n booking

# 4. Ver historial
kubectl rollout history deployment/booking-service -n booking
```

### Rollback

```bash
# Volver a la versión anterior
kubectl rollout undo deployment/booking-service -n booking

# Volver a una revisión específica
kubectl rollout undo deployment/booking-service -n booking --to-revision=2
```

### Actualizar ConfigMap o Secret

```bash
# 1. Editar ConfigMap
kubectl edit configmap booking-config -n booking

# 2. Reiniciar pods para que tomen los cambios
kubectl rollout restart deployment/booking-service -n booking
```

---

## 🔧 Troubleshooting

### Pod en estado CrashLoopBackOff

```bash
# Ver logs del pod que falla
kubectl logs -n booking <pod-name>

# Ver logs del contenedor anterior
kubectl logs -n booking <pod-name> --previous

# Describir el pod para ver eventos
kubectl describe pod <pod-name> -n booking
```

**Causas comunes:**
- PostgreSQL no está listo → Esperar más tiempo o ajustar `initialDelaySeconds`
- Variables de entorno incorrectas → Verificar ConfigMap/Secret
- Imagen no disponible → Verificar `imagePullPolicy` y registry

### Pod en estado Pending

```bash
kubectl describe pod <pod-name> -n booking | grep -A 5 Events
```

**Causas comunes:**
- Recursos insuficientes → Reducir `requests` o agregar nodos
- PVC no puede ser provisionado → Verificar StorageClass

### Healthchecks Fallando

```bash
# Verificar manualmente
POD=$(kubectl get pod -n booking -l app=booking-service -o jsonpath="{.items[0].metadata.name}")
kubectl exec -n booking $POD -- curl -v http://localhost:5000/health
kubectl exec -n booking $POD -- curl -v http://localhost:5000/ready

# Ver logs
kubectl logs -n booking $POD
```

**Soluciones:**
- Aumentar `initialDelaySeconds` si la app tarda en iniciar
- Verificar conectividad a PostgreSQL
- Revisar logs para errores de inicio

### PostgreSQL no se conecta

```bash
# Verificar que el pod está corriendo
kubectl get pods -n booking -l app=postgres

# Probar conectividad
kubectl exec -n booking postgres-0 -- pg_isready -U booking

# Conectarse manualmente
kubectl exec -it -n booking postgres-0 -- psql -U booking -d bookingdb

# Ver logs
kubectl logs -n booking postgres-0
```

### Migraciones Fallan

```bash
# Ver error completo
kubectl exec -n booking $POD -- npm run db:migrate 2>&1

# Verificar configuración de Sequelize
kubectl exec -n booking $POD -- cat src/config/database.json

# Conectarse a PostgreSQL y verificar tablas
kubectl exec -it -n booking postgres-0 -- psql -U booking -d bookingdb -c "\dt"
```

### Service no es accesible

```bash
# Verificar endpoints
kubectl get endpoints booking-service -n booking

# Debe mostrar IPs de los pods. Si está vacío, verificar selector del Service:
kubectl get svc booking-service -n booking -o yaml | grep selector -A 2
kubectl get pods -n booking -l app=booking-service --show-labels
```

---

## 🧹 Limpieza

### Eliminar Todo

```bash
# Opción 1: Eliminar namespace (más rápido)
kubectl delete namespace booking

# Opción 2: Eliminar recursos individualmente
kubectl delete -f deployment.yaml
kubectl delete -f postgres.yaml
kubectl delete -f configmap.yaml
kubectl delete -f secret.yaml
kubectl delete -f namespace.yaml
```

### Eliminar Solo el Booking Service (mantener BD)

```bash
kubectl delete -f deployment.yaml
```

### Eliminar PVC (datos de PostgreSQL)

```bash
kubectl delete pvc -n booking postgres-data-postgres-0
```

**⚠️ ADVERTENCIA:** Esto eliminará todos los datos de la base de datos permanentemente.

---

## 📋 Checklist de Despliegue

- [ ] Cluster de Kubernetes activo
- [ ] `kubectl` configurado
- [ ] Imagen Docker construida y disponible
- [ ] Namespace creado (`namespace.yaml`)
- [ ] Secret creado con credenciales seguras (`secret.yaml`)
- [ ] ConfigMap creado (`configmap.yaml`)
- [ ] PostgreSQL desplegado y ready (`postgres.yaml`)
- [ ] Booking service desplegado y ready (`deployment.yaml`)
- [ ] Migraciones aplicadas (`npm run db:migrate`)
- [ ] Healthchecks pasando
- [ ] Port forward o Ingress configurado
- [ ] Prueba de GraphQL query exitosa

---

## 🔗 Referencias

- [Documentación del Booking Service](../booking-service/README.md)
- [Ejemplos GraphQL](../booking-service/GRAPHQL_EXAMPLES.md)
- [Colección Postman](../booking-service/postman_collection.json)
- [README Principal del Proyecto](../README.md)
- [Kubernetes Docs - StatefulSets](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/)

---

## 🎯 Arquitectura Desplegada

```
┌─────────────────────────────────────────────────────────────────┐
│                      Kubernetes Cluster                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Namespace: booking                           │  │
│  │                                                           │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐    │  │
│  │  │  Frontend   │  │ Auth Service │  │ User Service│    │  │
│  │  │  (Next.js)  │  │   (REST)     │  │   (REST)    │    │  │
│  │  │  Port 3000  │  │  Port 4000   │  │  Port 5003  │    │  │
│  │  │  2 replicas │  │  2 replicas  │  │  2 replicas │    │  │
│  │  └──────┬──────┘  └──────┬───────┘  └──────┬──────┘    │  │
│  │         │                 │                  │           │  │
│  │  ┌──────┴──────────────────┴──────────────────┴─────┐  │  │
│  │  │                                                     │  │  │
│  │  │  ┌─────────────────┐      ┌──────────────────┐   │  │  │
│  │  │  │ Booking Service │      │ Notification Svc │   │  │  │
│  │  │  │    (GraphQL)    │      │      (REST)      │   │  │  │
│  │  │  │    Port 5000    │      │    Port 5002     │   │  │  │
│  │  │  │   2 replicas    │      │   2 replicas     │   │  │  │
│  │  │  └────────┬────────┘      └──────────────────┘   │  │  │
│  │  │           │                                        │  │  │
│  │  └───────────┼────────────────────────────────────────┘  │
│  │              │                           │                │
│  │  ┌───────────┴────────┐     ┌──────────┴────────┐       │
│  │  │    PostgreSQL      │     │      MongoDB       │       │
│  │  │  (StatefulSet)     │     │   (StatefulSet)    │       │
│  │  │  PVC: 1Gi          │     │   PVC: 2Gi         │       │
│  │  └────────────────────┘     └────────────────────┘       │
│  │                                                            │
│  └────────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────────┘
```

**Total de Pods:** 13
- Frontend: 2
- Auth Service: 2
- User Service: 2
- Booking Service: 2
- Notification Service: 2
- MongoDB: 1
- PostgreSQL: 1

---

## 📞 Contacto y Soporte

Para preguntas o problemas:
- Ver documentación completa en archivos README
- Revisar logs: `kubectl logs -n booking -l app=<service-name>`
- Ver eventos: `kubectl get events -n booking`

---

**Sistema completo desplegado en Kubernetes ✅**

Todos los microservicios están corriendo con alta disponibilidad, persistencia de datos y healthchecks configurados.
