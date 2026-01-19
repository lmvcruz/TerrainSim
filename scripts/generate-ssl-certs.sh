#!/bin/bash
# Generate self-signed SSL certificates for local development
# These are for TESTING ONLY - use proper certificates in production

set -e

CERT_DIR="docker/nginx/ssl"
DAYS_VALID=365

echo "🔐 Generating self-signed SSL certificates..."
echo "⚠️  WARNING: These certificates are for LOCAL DEVELOPMENT ONLY"
echo ""

# Create directory if it doesn't exist
mkdir -p "$CERT_DIR"

# Generate private key
openssl genrsa -out "$CERT_DIR/key.pem" 2048

# Generate certificate
openssl req -new -x509 -key "$CERT_DIR/key.pem" -out "$CERT_DIR/cert.pem" -days $DAYS_VALID \
  -subj "/C=US/ST=Dev/L=Local/O=TerrainSim/CN=localhost"

echo ""
echo "✅ SSL certificates generated successfully:"
echo "   - $CERT_DIR/cert.pem"
echo "   - $CERT_DIR/key.pem"
echo ""
echo "Valid for $DAYS_VALID days"
echo ""
echo "⚠️  Remember: These are SELF-SIGNED certificates"
echo "   Browsers will show security warnings - this is expected for local dev"
