#!/bin/bash

# Script para construir todas las imágenes Docker necesarias para Kubernetes

set -e

echo "🐳 Construyendo imágenes Docker para Kubernetes..."
echo ""

# Si usas Minikube, usa su Docker daemon
if command -v minikube &> /dev/null; then
    echo "🔧 Configurando Docker para usar Minikube..."
    eval $(minikube docker-env --shell bash)
    echo "✅ Docker configurado para Minikube"
    echo ""
fi

cd ..

# Frontend
echo "📦 Construyendo frontend..."
docker build -t frontend:latest ./frontend
echo "✅ Frontend construido"
echo ""

# Auth Service
echo "📦 Construyendo auth-service..."
docker build -t auth-service:latest ./auth-service
echo "✅ Auth Service construido"
echo ""

# User Service
echo "📦 Construyendo user-service..."
docker build -t user-service:latest ./user-service
echo "✅ User Service construido"
echo ""

# Booking Service
echo "📦 Construyendo booking-service..."
docker build -t booking-service:latest ./booking-service
echo "✅ Booking Service construido"
echo ""

# Notification Service
echo "📦 Construyendo notification-service..."
docker build -t notification-service:latest ./notification-service
echo "✅ Notification Service construido"
echo ""

echo "════════════════════════════════════════"
echo "✅ ¡Todas las imágenes construidas!"
echo "════════════════════════════════════════"
echo ""

echo "📋 Imágenes disponibles:"
docker images | grep -E "(frontend|auth-service|user-service|booking-service|notification-service)" | grep latest
echo ""

echo "🚀 Siguiente paso:"
echo "  cd k8s"
echo "  ./deploy.sh"
