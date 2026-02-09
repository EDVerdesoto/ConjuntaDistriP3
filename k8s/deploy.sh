#!/bin/bash

set -e

echo "🚀 Desplegando App Reservas en Kubernetes..."
echo ""

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Namespace
echo -e "${BLUE}📦 Creando namespace...${NC}"
kubectl apply -f namespace.yaml
echo ""

# 2. Secrets y ConfigMaps
echo -e "${BLUE}🔐 Creando Secrets y ConfigMaps...${NC}"
kubectl apply -f secret.yaml
kubectl apply -f configmap.yaml
kubectl apply -f notification-service.yaml
echo ""

# 3. Bases de datos
echo -e "${BLUE}🗄️  Desplegando bases de datos...${NC}"
kubectl apply -f mongodb.yaml
kubectl apply -f postgres.yaml
echo ""

echo -e "${YELLOW}⏳ Esperando a que las bases de datos estén listas...${NC}"
kubectl wait --for=condition=ready pod -l app=mongodb -n booking --timeout=120s
kubectl wait --for=condition=ready pod -l app=postgres -n booking --timeout=120s
echo -e "${GREEN}✅ Bases de datos listas${NC}"
echo ""

# 4. Backend Services
echo -e "${BLUE}⚙️  Desplegando servicios backend...${NC}"
kubectl apply -f auth-service.yaml
kubectl apply -f user-service.yaml
kubectl apply -f deployment.yaml  # booking-service
echo ""

echo -e "${YELLOW}⏳ Esperando a que los servicios backend estén listos...${NC}"
kubectl wait --for=condition=ready pod -l app=auth-service -n booking --timeout=120s
kubectl wait --for=condition=ready pod -l app=user-service -n booking --timeout=120s
kubectl wait --for=condition=ready pod -l app=booking-service -n booking --timeout=120s
kubectl wait --for=condition=ready pod -l app=notification-service -n booking --timeout=120s
echo -e "${GREEN}✅ Servicios backend listos${NC}"
echo ""

# 5. Frontend
echo -e "${BLUE}🎨 Desplegando frontend...${NC}"
kubectl apply -f frontend.yaml
echo ""

echo -e "${YELLOW}⏳ Esperando a que el frontend esté listo...${NC}"
kubectl wait --for=condition=ready pod -l app=frontend -n booking --timeout=120s
echo -e "${GREEN}✅ Frontend listo${NC}"
echo ""

# 7. Ingress (opcional)
if [ -f "ingress.yaml" ]; then
  echo -e "${BLUE}🌐 Configurando Ingress...${NC}"
  kubectl apply -f ingress.yaml
  echo ""
fi

# Resumen
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ ¡Despliegue completado exitosamente!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""

echo "📊 Estado de los pods:"
kubectl get pods -n booking
echo ""

echo "🌐 Servicios disponibles:"
kubectl get svc -n booking
echo ""

echo -e "${BLUE}🔗 Para acceder a los servicios:${NC}"
echo ""
echo "Frontend:"
echo "  kubectl port-forward -n booking svc/frontend 3000:3000"
echo "  → http://localhost:3000"
echo ""
echo "Booking Service (GraphQL):"
echo "  kubectl port-forward -n booking svc/booking-service 5000:5000"
echo "  → http://localhost:5000/graphql"
echo ""
echo "Auth Service:"
echo "  kubectl port-forward -n booking svc/auth-service 4000:4000"
echo "  → http://localhost:4000"
echo ""
echo "User Service:"
echo "  kubectl port-forward -n booking svc/user-service 5003:5003"
echo "  → http://localhost:5003"
echo ""

echo -e "${YELLOW}💡 Ver logs:${NC}"
echo "  kubectl logs -n booking -l app=booking-service -f"
echo ""

echo -e "${YELLOW}💡 Eliminar todo:${NC}"
echo "  ./undeploy.sh"
echo "  o"
echo "  kubectl delete namespace booking"
