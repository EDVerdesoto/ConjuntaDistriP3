#!/bin/bash

echo "🗑️  Eliminando App Reservas de Kubernetes..."
echo ""

# Colores
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}⚠️  Esto eliminará todos los recursos del namespace 'booking'${NC}"
echo -e "${YELLOW}⚠️  Los datos de las bases de datos se perderán${NC}"
echo ""

read -p "¿Estás seguro? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelado"
    exit 1
fi

echo ""
echo -e "${RED}Eliminando namespace booking...${NC}"
kubectl delete namespace booking

echo ""
echo "✅ Recursos eliminados"
echo ""
echo "Para verificar:"
echo "  kubectl get namespaces"
