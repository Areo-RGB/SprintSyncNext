#!/bin/bash

# Create SSL certificates for HTTPS development
mkdir -p certificates

# Create a certificate authority (CA)
openssl genrsa -out certificates/ca.key 2048
openssl req -x509 -new -nodes -key certificates/ca.key -sha256 -days 3650 -out certificates/ca.crt -subj "/CN=Local CA"

# Create server certificate signing request (CSR)
openssl genrsa -out certificates/server.key 2048
openssl req -new -key certificates/server.key -out certificates/server.csr -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1"

# Sign the server certificate with the CA
openssl x509 -req -in certificates/server.csr -CA certificates/ca.crt -CAkey certificates/ca.key -CAcreateserial -out certificates/server.crt -days 365 -sha256 -extfile <(cat <<EOF
[v3_req]
subjectAltName = @alt_names
[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
IP.1 = 127.0.0.1
EOF
)

echo "SSL certificates created successfully!"
echo "CA Certificate: certificates/ca.crt"
echo "Server Certificate: certificates/server.crt"
echo "Server Key: certificates/server.key"
echo ""
echo "To trust the CA certificate:"
echo "  - macOS: Double-click certificates/ca.crt and add to Keychain Access -> System -> Always Trust"
echo "  - Linux: sudo cp certificates/ca.crt /usr/local/share/ca-certificates/localhost-ca.crt && sudo update-ca-certificates"
echo "  - Windows: Double-click certificates/ca.crt -> Install Certificate -> Current User -> Trusted Root Certification Authorities"