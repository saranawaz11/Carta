# Nginx Reverse Proxy Setup for Carta on EC2

This guide adds an Nginx Docker container in front of the existing Carta
deployment on an Amazon Linux EC2 instance. It assumes that Docker, Docker
Compose, and the EC2 Compose deployment already work.

Target traffic flow:

```text
Internet
   |
   +--> Nginx on the EC2 host (HTTP 80, HTTPS 443)
          |
          +--> frontend service on 127.0.0.1:3000
          +--> backend service on 127.0.0.1:8000
                    |
                    +--> redis service (Docker network only)
```

The ports `3000`, `8000`, and `6379` must not be public after this guide is
complete. The frontend and backend remain available on the EC2 host's
loopback interface so the Nginx container can proxy to them.

Replace every occurrence of `YOUR_EC2_PUBLIC_IP` with the instance's actual
public IP address. Replace `~/Carta` if the repository is stored elsewhere.
Commands containing secrets should be edited locally and never pasted into
chat, tickets, or source control.

## Information Needed From You

No additional repository route or service values are required. The following
deployment-specific values must be supplied when running the commands:

1. `YOUR_EC2_PUBLIC_IP`: the current public or Elastic IP address.
2. The real Clerk issuer, publishable key, and secret key already used by the
   application. Keep all actual secret values only in the EC2 `.env` files.
3. Confirmation in the Clerk dashboard that the selected public IP origin is
   accepted for this environment. The repository cannot show external Clerk
   dashboard settings.
4. Access to the existing frontend image build process. `NEXT_PUBLIC_API_URL`
   is embedded in the Next.js image at build time, so changing only the EC2
   `.env` file cannot update it. This guide intentionally does not cover ECR.

## Repository-specific routing facts

The configuration below is based on the checked-in application:

| Traffic | Public path | Container target |
| --- | --- | --- |
| Next.js pages and static assets | All paths not matched below | `127.0.0.1:3000` |
| FastAPI REST and streaming endpoints | `/api/*` | `127.0.0.1:8000` |
| Voice transcription WebSocket | `/ws/transcribe` | `127.0.0.1:8000` |
| Backend health endpoint | `/test` | `127.0.0.1:8000` |
| FastAPI documentation | `/docs`, `/redoc`, `/openapi.json` | `127.0.0.1:8000` |

The frontend derives the transcription WebSocket URL from
`NEXT_PUBLIC_API_URL`, changing `http` to `ws` and `https` to `wss`. Nginx
therefore must preserve WebSocket upgrade headers. The chat endpoint also uses
an NDJSON stream, so response buffering must be disabled for `/api/`.

Redis has no host port mapping in [docker-compose.ecr.yml](docker-compose.ecr.yml)
and remains reachable only as `redis:6379` on the `carta-network` Docker
network.

## 1. Check the current deployment and exposed ports

### 1.1 Inspect the Compose services

**Run on EC2:**

```bash
cd ~/Carta
docker compose -f docker-compose.ecr.yml ps
```

This shows service state, health, and published host ports.

**Expected output:** `redis`, `backend`, and `frontend` exist. `backend` and
`frontend` should show port bindings ending in `:8000->8000/tcp` and
`:3000->3000/tcp`; Redis should show no published host port.

### 1.2 Confirm the services on the EC2 host

**Run on EC2:**

```bash
sudo ss -lntp | grep -E ':(3000|8000)\b' || true
curl -fsS http://127.0.0.1:8000/test
curl -sS -o /dev/null -w 'frontend status: %{http_code}\n' http://127.0.0.1:3000/
```

The first command lists listeners. The other two commands verify that the
backend and frontend processes respond from the host.

**Expected output:** Docker is listening on `0.0.0.0:3000` and `0.0.0.0:8000` or
`[::]:3000` and `[::]:8000` before this change. The health request prints:

```json
{"message":"Hello from FastAPI"}
```

The frontend status should be an HTTP status below `500`.

### 1.3 Record the current configuration

**Run on EC2:**

```bash
cd ~/Carta
cp docker-compose.ecr.yml "docker-compose.ecr.yml.before-nginx.$(date +%Y%m%d-%H%M%S)"
cp backend/.env "backend/.env.before-nginx.$(date +%Y%m%d-%H%M%S)"
cp .env ".env.before-nginx.$(date +%Y%m%d-%H%M%S)"
chmod 600 \
  backend/.env.before-nginx.* \
  .env.before-nginx.*
```

This creates timestamped backups without replacing the existing files.

**Expected output:** no output. Confirm the backups:

```bash
ls -l docker-compose.ecr.yml.before-nginx.* \
  backend/.env.before-nginx.* \
  .env.before-nginx.*
```

## 2. Restrict the application containers to loopback

### 2.1 Edit the EC2 Compose file

**Run on EC2:**

```bash
cd ~/Carta
nano docker-compose.ecr.yml
```

Apply only this diff. Do not change service names or internal ports:

```diff
 services:
   backend:
@@
     ports:
-      - "8000:8000"
+      - "127.0.0.1:8000:8000"
@@
   frontend:
@@
     ports:
-      - "3000:3000"
+      - "127.0.0.1:3000:3000"
```

Binding to `127.0.0.1` prevents Docker from publishing ports `3000` and `8000`
on every EC2 network interface.

### 2.2 Validate and recreate only the affected containers

**Run on EC2:**

```bash
cd ~/Carta
docker compose -f docker-compose.ecr.yml config --quiet
docker compose -f docker-compose.ecr.yml up -d --force-recreate backend frontend
docker compose -f docker-compose.ecr.yml ps
```

The config check catches YAML or Compose errors. Only `backend` and `frontend`
are recreated; Redis remains running.

**Expected output:** `docker compose ... ps` shows:

```text
127.0.0.1:8000->8000/tcp
127.0.0.1:3000->3000/tcp
```

### 2.3 Verify loopback access is preserved

**Run on EC2:**

```bash
sudo ss -lntp | grep -E ':(3000|8000)\b' || true
curl -fsS http://127.0.0.1:8000/test
curl -sS -o /dev/null -w 'frontend status: %{http_code}\n' http://127.0.0.1:3000/
```

**Expected output:** listeners show `127.0.0.1`, not `0.0.0.0` or `*`. Both
loopback requests continue to work.

## 3. Install and run Nginx as a Docker container

Nginx does not need to be installed with `dnf`; the official image supplies it.
Docker remains responsible for starting and restarting the container.

### 3.1 Pull the pinned Nginx image

**Run on EC2:**

```bash
docker pull nginx:1.28-alpine
```

**Expected output:** Docker downloads the image and ends with a digest and
`Status: Image is up to date` or `Downloaded newer image`.

### 3.2 Prepare an isolated Nginx configuration directory

**Run on EC2:**

```bash
sudo mkdir -p /opt/carta-nginx/conf.d /opt/carta-nginx/certs
sudo chown -R ec2-user:ec2-user /opt/carta-nginx
chmod 700 /opt/carta-nginx /opt/carta-nginx/certs
```

This keeps Nginx configuration separate from the application repository and
makes certificates private.

**Expected output:** no output. Verify the ownership:

```bash
ls -ld /opt/carta-nginx /opt/carta-nginx/conf.d /opt/carta-nginx/certs
```

### 3.3 Run a temporary Nginx container to verify port 80

**Run on EC2:**

```bash
if docker ps -a --format '{{.Names}}' | grep -qx carta-nginx-bootstrap; then
  echo "carta-nginx-bootstrap already exists; do not replace it" >&2
  exit 1
fi

docker run -d \
  --name carta-nginx-bootstrap \
  --network host \
  --restart unless-stopped \
  nginx:1.28-alpine

curl -fsS http://127.0.0.1/ | grep -i 'Welcome to nginx'
```

`--network host` lets the Nginx container use the EC2 host network and reach
the loopback-only Carta containers. It also makes Nginx bind directly to host
ports `80` and, later, `443`.

**Expected output:** the final command prints a line containing
`Welcome to nginx!`.

Do not remove this container yet; it is replaced by the permanent configuration
in step 5.

## 4. Update the AWS security group

Use the security group currently attached to the EC2 network interface.

### 4.1 Add Nginx ingress

**Run on local machine:** open the EC2 console, select the instance, and edit
its security group's inbound rules.

Add or preserve:

| Type | Port | Source | Purpose |
| --- | --- | --- | --- |
| SSH | 22 | Your current trusted public IP/32 | Existing administration access |
| HTTP | 80 | 0.0.0.0/0 | Initial Nginx endpoint and HTTPS redirect |
| HTTPS | 443 | 0.0.0.0/0 | Final Nginx endpoint |

Do not add Redis port `6379`.

**Expected result:** ports `80` and `443` are listed as inbound rules.

### 4.2 Remove direct application ingress

**Run on local machine:** in the same security group, delete public inbound rules
for:

- TCP `3000`
- TCP `8000`

Do not remove the application's outbound access to PostgreSQL, Clerk, OpenAI,
or container registries.

**Expected result:** `3000` and `8000` are absent from the security-group
inbound rules. Nginx is now the only publicly reachable Carta entry point.

### 4.3 Test the Nginx port

**Run on local machine:**

```bash
curl --connect-timeout 10 -sS -o /dev/null \
  -w 'HTTP status through port 80: %{http_code}\n' \
  http://YOUR_EC2_PUBLIC_IP/
```

**Expected output:**

```text
HTTP status through port 80: 200
```

At this stage this is still the default Nginx page.

## 5. Write and enable the Carta reverse proxy configuration

### 5.1 Create the main Nginx configuration

**Run on EC2:**

```bash
if test -e /opt/carta-nginx/nginx.conf; then
  echo "/opt/carta-nginx/nginx.conf already exists; not overwriting it" >&2
  exit 1
fi

cat > /opt/carta-nginx/nginx.conf <<'EOF'
user  nginx;
worker_processes  auto;
pid        /var/run/nginx.pid;

events {
    worker_connections  1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log  /var/log/nginx/access.log  main;
    error_log   /var/log/nginx/error.log   warn;

    sendfile        on;
    keepalive_timeout  65;
    server_tokens off;

    map $http_upgrade $connection_upgrade {
        default upgrade;
        ''      close;
    }

    include /etc/nginx/conf.d/*.conf;
}
EOF
```

This creates the Nginx process and logging configuration. The `map` converts
ordinary connections to `close` and WebSocket upgrades to `upgrade`.

**Expected output:** no output.

### 5.2 Create the HTTP reverse proxy configuration

**Run on EC2:**

```bash
if test -e /opt/carta-nginx/conf.d/carta-http.conf; then
  echo "/opt/carta-nginx/conf.d/carta-http.conf already exists; not overwriting it" >&2
  exit 1
fi

cat > /opt/carta-nginx/conf.d/carta-http.conf <<'EOF'
upstream carta_frontend {
    server 127.0.0.1:3000;
    keepalive 32;
}

upstream carta_backend {
    server 127.0.0.1:8000;
    keepalive 32;
}

server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    client_max_body_size 20m;

    location = /test {
        proxy_pass http://carta_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location = /openapi.json {
        proxy_pass http://carta_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /docs {
        proxy_pass http://carta_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /redoc {
        proxy_pass http://carta_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ws/ {
        proxy_pass http://carta_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }

    location /api/ {
        proxy_pass http://carta_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        add_header X-Accel-Buffering no;
        add_header X-Content-Type-Options nosniff always;
        add_header X-Frame-Options SAMEORIGIN always;
        add_header Referrer-Policy strict-origin-when-cross-origin always;
    }

    location / {
        proxy_pass http://carta_frontend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
```

This routes the repository's actual `/api/*`, `/ws/transcribe`, health, and
documentation paths to FastAPI. All other requests go to Next.js.

**Expected output:** no output.

### 5.3 Create the persistent Nginx Compose file

**Run on EC2:**

```bash
if test -e /opt/carta-nginx/docker-compose.yml; then
  echo "/opt/carta-nginx/docker-compose.yml already exists; not overwriting it" >&2
  exit 1
fi

cat > /opt/carta-nginx/docker-compose.yml <<'YAML'
services:
  nginx:
    image: nginx:1.28-alpine
    container_name: carta-nginx
    network_mode: host
    restart: unless-stopped
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./conf.d:/etc/nginx/conf.d:ro
      - ./certs:/etc/nginx/certs:ro
YAML
```

This file keeps the reverse proxy persistent while sharing the host network.

**Expected output:** no output.

### 5.4 Replace the bootstrap container

**Run on EC2:**

```bash
docker stop carta-nginx-bootstrap
docker rm carta-nginx-bootstrap
cd /opt/carta-nginx
docker compose config --quiet
docker compose up -d
docker compose ps
```

Stopping the bootstrap container releases port 80 before the configured
container starts.

**Expected output:** one service named `nginx` is `Up`, and the Compose service
has no explicit `ports` column because it uses `network_mode: host`.

## 6. Test the configuration and reload Nginx

### 6.1 Validate configuration syntax

**Run on EC2:**

```bash
docker exec carta-nginx nginx -t
```

**Expected output:**

```text
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 6.2 Reload without interrupting active requests

**Run on EC2:**

```bash
docker exec carta-nginx nginx -s reload
docker ps --filter name=^/carta-nginx$ --format 'table {{.Names}}\t{{.Status}}'
```

**Expected output:** the container status starts with `Up`; no syntax or bind
error is printed.

### 6.3 Test routing from the EC2 host

**Run on EC2:**

```bash
curl -fsS http://127.0.0.1/test
curl -sS -o /dev/null -w 'frontend: %{http_code}\n' http://127.0.0.1/
curl -sS -o /dev/null -w 'API without token: %{http_code}\n' http://127.0.0.1/api/me
curl -sS -o /dev/null -w 'OpenAPI: %{http_code}\n' http://127.0.0.1/openapi.json
```

**Expected output:**

```text
{"message":"Hello from FastAPI"}
frontend: <200, 307, or 308>
API without token: 403 or 401
OpenAPI: 200
```

The unauthenticated API request should not succeed with private data; a `401`
or `403` proves that the backend received the request through Nginx.

## 7. Update application origins for the new entry point

The application already has Docker-loopback bindings. Now the browser-facing
origin changes from `http://YOUR_EC2_PUBLIC_IP:3000` or
`http://YOUR_EC2_PUBLIC_IP:8000` to the public Nginx URL on port 80:

```text
http://YOUR_EC2_PUBLIC_IP
```

### 7.1 Backend CORS and Clerk authorized-party change

**Run on EC2:**

```bash
cd ~/Carta
nano backend/.env
```

Apply this diff using the real public IP:

```diff
-CLERK_AUTHORIZED_PARTIES=http://YOUR_EC2_PUBLIC_IP:3000
+CLERK_AUTHORIZED_PARTIES=http://YOUR_EC2_PUBLIC_IP

-FRONTEND_ORIGIN=http://YOUR_EC2_PUBLIC_IP:3000
+FRONTEND_ORIGIN=http://YOUR_EC2_PUBLIC_IP
```

`FRONTEND_ORIGIN` supplies FastAPI CORS allowed origins.
`CLERK_AUTHORIZED_PARTIES` controls the JWT `azp` claim accepted by the
backend. Keep all non-origin values in the file unchanged.

**Expected result:** the two values have no `:3000` or trailing slash.

### 7.2 Frontend build-time API URL change

**Run on local machine:** edit the source deployment `.env` used by the
frontend image build process:

```diff
-NEXT_PUBLIC_API_URL=http://YOUR_EC2_PUBLIC_IP:8000
+NEXT_PUBLIC_API_URL=http://YOUR_EC2_PUBLIC_IP
```

This uses the same public origin for the frontend, REST API, and WebSocket.
Nginx separates the traffic by path.

Then rebuild and publish the frontend image using the build process already
used for this deployment. Do not put `CLERK_SECRET_KEY` in a build argument.
ECR commands are intentionally outside this guide.

**Expected result:** the newly deployed frontend image contains:

```text
NEXT_PUBLIC_API_URL=http://YOUR_EC2_PUBLIC_IP
```

Changing only the EC2 root `.env` is insufficient because
[frontend/Dockerfile](frontend/Dockerfile) writes `NEXT_PUBLIC_*` values into
the Next.js build. The root `.env` should still be kept consistent:

**Run on EC2:**

```bash
cd ~/Carta
nano .env
```

```diff
-NEXT_PUBLIC_API_URL=http://YOUR_EC2_PUBLIC_IP:8000
+NEXT_PUBLIC_API_URL=http://YOUR_EC2_PUBLIC_IP
```

### 7.3 Update Clerk's external authorized origin

**Run on local machine:** in the existing Clerk application, authorize the exact
browser origin if that setting is required by the deployed Clerk environment:

```text
http://YOUR_EC2_PUBLIC_IP
```

If the Clerk environment rejects a raw IP origin, do not invent a hostname.
See "Information Needed From You"; the reverse proxy cannot correct an external
authentication policy.

### 7.4 Restart only the containers that need new environment

**Run on EC2:**

```bash
cd ~/Carta
docker compose -f docker-compose.ecr.yml pull frontend
docker compose -f docker-compose.ecr.yml up -d --force-recreate backend frontend
docker compose -f docker-compose.ecr.yml ps
```

The backend reads `FRONTEND_ORIGIN` and `CLERK_AUTHORIZED_PARTIES` at process
start. The frontend container must be recreated to use the newly published
frontend image. Redis and Nginx do not need a restart.

**Expected output:** `backend` and `frontend` become healthy. Redis keeps the
same container ID.

If the new frontend image is not ready, stop here rather than starting a
partially updated deployment: the old frontend will still attempt to connect
directly to port `8000`, which is now intentionally blocked.

## 8. Verify HTTP access and confirm direct ports are closed

### 8.1 Verify the Nginx entry point

**Run on local machine:**

```bash
curl -fsS http://YOUR_EC2_PUBLIC_IP/test
curl -I http://YOUR_EC2_PUBLIC_IP/
curl -sS -o /dev/null -w 'OpenAPI status: %{http_code}\n' \
  http://YOUR_EC2_PUBLIC_IP/openapi.json
curl -sS -o /dev/null -w 'Unauthenticated API status: %{http_code}\n' \
  http://YOUR_EC2_PUBLIC_IP/api/me
```

**Expected output:** `/test` returns the FastAPI greeting, `/` returns the
frontend or a redirect, `/openapi.json` returns `200`, and `/api/me` returns
`401` or `403`.

### 8.2 Verify CORS

**Run on local machine:**

```bash
curl -i -X OPTIONS \
  -H 'Origin: http://YOUR_EC2_PUBLIC_IP' \
  -H 'Access-Control-Request-Method: GET' \
  http://YOUR_EC2_PUBLIC_IP/api/me
```

**Expected output:** `200` or `204` and an
`Access-Control-Allow-Origin: http://YOUR_EC2_PUBLIC_IP` response header.

### 8.3 Verify direct ports are unreachable

**Run on local machine:**

```bash
curl --connect-timeout 5 -I http://YOUR_EC2_PUBLIC_IP:3000/
echo "frontend direct-port exit: $?"

curl --connect-timeout 5 http://YOUR_EC2_PUBLIC_IP:8000/test
echo "backend direct-port exit: $?"
```

**Expected output:** both commands time out or are refused and print a non-zero
exit status (usually `7`, `28`, or `52`). They must not return Carta responses.

The same loopback endpoints should still work from EC2:

**Run on EC2:**

```bash
curl -fsS http://127.0.0.1:8000/test
curl -sS -o /dev/null -w 'local frontend status: %{http_code}\n' \
  http://127.0.0.1:3000/
```

### 8.4 Verify the browser flow

**Run on local machine:** open:

```text
http://YOUR_EC2_PUBLIC_IP/
```

Sign in and test:

- Notes and folders
- Tasks
- Chat streaming
- Voice WebSocket connection

Voice also requires browser microphone permission and a secure context.
Microphone capture may be unavailable over a raw public-IP HTTP address; the
HTTPS step below improves transport encryption but a self-signed certificate
still requires a trust bypass in the browser.

## 9. Add HTTPS with a self-signed certificate

A self-signed certificate encrypts traffic, but browsers do not trust it.
Every visitor will need to accept a warning manually, and automated clients
will reject it unless explicitly configured to do so. A raw public IP cannot
normally receive a normal public-trust certificate from services that require
domain validation. A domain and a trusted CA certificate are required for a
warning-free production deployment.

### 9.1 Install the certificate tool

**Run on EC2:**

```bash
openssl version || sudo dnf install -y openssl
```

**Expected output:** an OpenSSL version, either already present or printed
after installation.

### 9.2 Generate an IP-address certificate without overwriting one

**Run on EC2:**

```bash
CERT=/opt/carta-nginx/certs/carta-self-signed.crt
KEY=/opt/carta-nginx/certs/carta-self-signed.key

if test -e "$CERT" || test -e "$KEY"; then
  echo "Certificate or key already exists; do not overwrite it" >&2
  exit 1
fi

openssl req -x509 -nodes -newkey rsa:2048 -sha256 -days 825 \
  -keyout "$KEY" \
  -out "$CERT" \
  -subj "/CN=YOUR_EC2_PUBLIC_IP" \
  -addext "subjectAltName=IP:YOUR_EC2_PUBLIC_IP"

chmod 600 "$KEY"
chmod 644 "$CERT"
openssl x509 -in "$CERT" -noout -subject -ext subjectAltName
```

Replace the two IP placeholders before running the command.

**Expected output:** the certificate subject and a
`subjectAltName = IP Address:YOUR_EC2_PUBLIC_IP` line.

### 9.3 Create the HTTPS/redirect configuration separately

Keep the working HTTP configuration intact until the TLS file is tested.

**Run on EC2:**

```bash
if test -e /opt/carta-nginx/conf.d/carta-tls.conf.new; then
  echo "Temporary TLS config already exists; not overwriting it" >&2
  exit 1
fi

cat > /opt/carta-nginx/conf.d/carta-tls.conf.new <<'EOF'
upstream carta_frontend {
    server 127.0.0.1:3000;
    keepalive 32;
}

upstream carta_backend {
    server 127.0.0.1:8000;
    keepalive 32;
}

server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    return 308 https://YOUR_EC2_PUBLIC_IP$request_uri;
}

server {
    listen 443 ssl default_server;
    listen [::]:443 ssl default_server;
    server_name YOUR_EC2_PUBLIC_IP;

    ssl_certificate     /etc/nginx/certs/carta-self-signed.crt;
    ssl_certificate_key /etc/nginx/certs/carta-self-signed.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_session_cache shared:CartaTLS:10m;
    ssl_session_timeout 10m;

    client_max_body_size 20m;

    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options SAMEORIGIN always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;

    location = /test {
        proxy_pass http://carta_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location = /openapi.json {
        proxy_pass http://carta_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /docs {
        proxy_pass http://carta_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /redoc {
        proxy_pass http://carta_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ws/ {
        proxy_pass http://carta_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }

    location /api/ {
        proxy_pass http://carta_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        add_header X-Accel-Buffering no;
        add_header X-Content-Type-Options nosniff always;
        add_header X-Frame-Options SAMEORIGIN always;
        add_header Referrer-Policy strict-origin-when-cross-origin always;
    }

    location / {
        proxy_pass http://carta_frontend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
```

The file is not included yet because its `.new` suffix does not end in `.conf`.

### 9.4 Test before switching

Move the current HTTP file out of the included extension only after preserving
the known-good version:

**Run on EC2:**

```bash
STAMP="$(date +%Y%m%d-%H%M%S)"
if test -e "/opt/carta-nginx/conf.d/carta-tls.conf"; then
  echo "carta-tls.conf already exists; do not overwrite it" >&2
  exit 1
fi

mv /opt/carta-nginx/conf.d/carta-http.conf \
  "/opt/carta-nginx/conf.d/carta-http.conf.disabled-${STAMP}"
cp /opt/carta-nginx/conf.d/carta-tls.conf.new \
  /opt/carta-nginx/conf.d/carta-tls.conf
if ! docker exec carta-nginx nginx -t; then
  mv /opt/carta-nginx/conf.d/carta-tls.conf \
    "/opt/carta-nginx/conf.d/carta-tls.conf.failed-${STAMP}"
  mv "/opt/carta-nginx/conf.d/carta-http.conf.disabled-${STAMP}" \
    /opt/carta-nginx/conf.d/carta-http.conf
  echo "TLS config rolled back; fix the .failed file before retrying" >&2
  exit 1
fi
```

**Expected output:** the Nginx syntax test succeeds. If it fails, the original
HTTP configuration is restored without overwriting either file, and the command
exits before the reload.

### 9.5 Update HTTPS origins before the cutover

Schedule steps 9.5 and 9.6 as a short maintenance window. The frontend image
contains `NEXT_PUBLIC_API_URL` at build time, so the HTTP and HTTPS deployments
cannot be mixed without a brief cutover.

Update the backend environment first:

**Run on EC2:**

```bash
cd ~/Carta
nano backend/.env
```

```diff
-CLERK_AUTHORIZED_PARTIES=http://YOUR_EC2_PUBLIC_IP
+CLERK_AUTHORIZED_PARTIES=https://YOUR_EC2_PUBLIC_IP

-FRONTEND_ORIGIN=http://YOUR_EC2_PUBLIC_IP
+FRONTEND_ORIGIN=https://YOUR_EC2_PUBLIC_IP
```

Change the frontend build-time configuration:

**Run on local machine:** edit the `.env` or CI setting used to build the
frontend image:

```diff
-NEXT_PUBLIC_API_URL=http://YOUR_EC2_PUBLIC_IP
+NEXT_PUBLIC_API_URL=https://YOUR_EC2_PUBLIC_IP
```

`NEXT_PUBLIC_API_URL` must be changed on the **frontend build machine**, and a
new frontend image must be built and published. Do not proceed until that image
is available. ECR operations are intentionally outside this guide.

Also keep the runtime metadata on EC2 aligned:

**Run on EC2:**

```bash
cd ~/Carta
nano .env
```

```diff
-NEXT_PUBLIC_API_URL=http://YOUR_EC2_PUBLIC_IP
+NEXT_PUBLIC_API_URL=https://YOUR_EC2_PUBLIC_IP
```

Do not expect the EC2 root `.env` edit alone to change the baked bundle. Update
the Clerk authorized origin to the exact HTTPS value if Clerk requires that
setting.

Pull the prepared image without recreating the frontend yet:

**Run on EC2:**

```bash
cd ~/Carta
docker compose -f docker-compose.ecr.yml pull frontend
```

**Expected output:** the configured frontend image is downloaded and the
currently running frontend container continues unchanged until the cutover.

### 9.6 Perform the Nginx and application cutover

**Run on EC2:**

```bash
cd ~/Carta
docker exec carta-nginx nginx -s reload
docker compose -f docker-compose.ecr.yml up -d --force-recreate backend frontend
sudo ss -lntp | grep -E ':(80|443)\b'
```

Reloading activates the staged TLS/redirect configuration. The next command
recreates only the backend and frontend. Redis and Nginx stay running.

**Expected output:** Nginx is listening on ports `80` and `443`, and
`backend` and `frontend` return to a healthy state.

### 9.7 Verify HTTP redirect and HTTPS routing

**Run on local machine:**

```bash
curl -I http://YOUR_EC2_PUBLIC_IP/test
curl -k -fsS https://YOUR_EC2_PUBLIC_IP/test
curl -k -I https://YOUR_EC2_PUBLIC_IP/
```

`-k` tells `curl` to ignore the untrusted self-signed certificate for this test
only.

**Expected output:** the HTTP response is `308` with a
`Location: https://YOUR_EC2_PUBLIC_IP/test` header. The HTTPS health request
returns the FastAPI greeting. The frontend HTTPS request returns a status below
`500`.

Then verify the browser:

1. Open `https://YOUR_EC2_PUBLIC_IP/`.
2. Accept the self-signed certificate warning for testing only.
3. Sign in and verify notes, chat, and voice.

Do not add HSTS yet. A self-signed/IP setup is not appropriate for permanently
pinning browsers to HTTPS; HSTS should be enabled only with a trusted,
production certificate and a complete rollback plan.

## 10. Logs and troubleshooting

### 10.1 Log commands

**Run on EC2:**

```bash
docker logs --tail=200 carta-nginx
cd ~/Carta
docker compose -f docker-compose.ecr.yml logs --tail=200 frontend
docker compose -f docker-compose.ecr.yml logs --tail=200 backend
docker compose -f docker-compose.ecr.yml logs --tail=100 redis
```

Follow live Nginx logs:

```bash
docker logs -f carta-nginx
```

### 10.2 Troubleshooting matrix

| Symptom | Likely cause | What to run on EC2 | Corrective action |
| --- | --- | --- | --- |
| `502 Bad Gateway` for `/` | Frontend is stopped or port `3000` is not bound | `docker compose -f ~/Carta/docker-compose.ecr.yml ps`; `curl http://127.0.0.1:3000/` | Restore the frontend container/health before reloading Nginx |
| `502 Bad Gateway` for `/api/*`, `/ws/*`, or `/test` | Backend is stopped or port `8000` is not bound | `curl http://127.0.0.1:8000/test`; `docker compose ... logs backend` | Fix backend startup, database, Clerk, or environment errors |
| `504 Gateway Time-out` | Upstream request exceeded timeout or is stuck | `docker logs carta-nginx`; inspect backend/OpenAI/database latency | Confirm the endpoint is responsive; increase a specific location timeout only if justified |
| `404` on an API path | Path is not one of the checked-in `/api/*` routes | Compare the browser URL and backend route; inspect Nginx access log | Correct the frontend request or proxy location; do not strip `/api` with `proxy_pass` |
| Browser reaches frontend but API uses old `:8000` URL | Frontend image was not rebuilt | Search the built bundle or inspect the network request in browser developer tools | Rebuild and redeploy the frontend with the new same-origin `NEXT_PUBLIC_API_URL` |
| CORS error | `FRONTEND_ORIGIN` does not match the exact browser scheme/origin | Inspect `backend/.env`; recreate backend | Use exactly `http://YOUR_EC2_PUBLIC_IP` or `https://YOUR_EC2_PUBLIC_IP`, with no port and no trailing slash |
| `401`/Clerk failure | `CLERK_AUTHORIZED_PARTIES` or Clerk dashboard origin is wrong | Inspect the origin and backend logs; inspect token `azp` only in a secure debugger | Align the environment value and Clerk dashboard; never log a token publicly |
| Voice WebSocket fails | Upgrade headers blocked, or the page is not in a usable secure context | `docker logs carta-nginx`; use browser Network > WS | Confirm `/ws/transcribe` proxying, HTTPS, and microphone permission |
| Chat response arrives all at once or stalls | Response buffering enabled | `docker exec carta-nginx nginx -T` | Confirm `/api/` has `proxy_buffering off` |
| Nginx fails after reboot | Container or Docker restart failed | `docker ps -a`; `sudo systemctl status docker`; `docker logs carta-nginx` | Start Docker and inspect the failed container |
| Port 80/443 is already in use | Another host service/container owns the port | `sudo ss -lntp | grep -E ':(80|443)\b'` | Stop the conflicting service only after identifying it; do not kill by name blindly |
| TLS browser warning | Certificate is self-signed | Inspect browser certificate details | Accept for testing or use a real domain/trusted certificate for production |

## 11. Basic security hardening

### 11.1 Keep the host service boundary narrow

**Run on local machine:** ensure the EC2 security group:

- Allows SSH only from a trusted source
- Allows inbound `80` and `443`
- Does not allow inbound `3000`, `8000`, or `6379`

### 11.2 Protect files

**Run on EC2:**

```bash
chmod 600 ~/Carta/.env ~/Carta/backend/.env
chmod 600 /opt/carta-nginx/certs/carta-self-signed.key
chmod 700 /opt/carta-nginx/certs
```

**Expected output:** no output.

### 11.3 Keep the Nginx image and application images current

**Run on EC2:**

```bash
docker pull nginx:1.28-alpine
cd /opt/carta-nginx
docker compose up -d
```

Review image update release notes and test in a non-production environment when
possible. A pinned major/minor image tag should be changed deliberately.

### 11.4 Do not expose internal diagnostics

`/docs` and `/openapi.json` are currently proxied for verification. For a
private production API, remove those locations from the Nginx configuration or
return `404` when they are not needed. `/test` can also be limited to a trusted
source or removed from public exposure after operational monitoring is added.

### 11.5 Avoid unsupported TLS assumptions

Do not enable `Strict-Transport-Security` for a raw-IP/self-signed setup.
Do not disable certificate checking in user scripts or application code.
`curl -k` is appropriate only for the explicit certificate test in this guide.

## 12. Safely update or roll back Nginx

### 12.1 Prepare a configuration change without overwriting the active file

**Run on EC2:**

```bash
STAMP="$(date +%Y%m%d-%H%M%S)"
cp /opt/carta-nginx/conf.d/carta-tls.conf \
  "/opt/carta-nginx/conf.d/carta-tls.conf.backup-${STAMP}"
cp /opt/carta-nginx/conf.d/carta-tls.conf \
  "/opt/carta-nginx/conf.d/carta-tls.conf.proposed-${STAMP}"
nano "/opt/carta-nginx/conf.d/carta-tls.conf.proposed-${STAMP}"
```

The active `.conf` remains unchanged. The proposed file ends in a non-`.conf`
suffix, so Nginx does not load it.

### 12.2 Test the proposed file in an isolated Nginx check

The mounted `conf.d` directory contains the active file and the proposed file.
To test a proposed file without replacing the active file, run a temporary
directory:

**Run on EC2:**

```bash
STAMP=REPLACE_WITH_THE_TIMESTAMP_FROM_THE_PREVIOUS_STEP
TEST_DIR="/tmp/carta-nginx-test-${STAMP}"
mkdir -p "$TEST_DIR/conf.d" "$TEST_DIR/certs"
cp /opt/carta-nginx/nginx.conf "$TEST_DIR/nginx.conf"
cp "/opt/carta-nginx/conf.d/carta-tls.conf.proposed-${STAMP}" \
  "$TEST_DIR/conf.d/carta-tls.conf"
cp /opt/carta-nginx/certs/carta-self-signed.crt "$TEST_DIR/certs/"
cp /opt/carta-nginx/certs/carta-self-signed.key "$TEST_DIR/certs/"

docker run --rm \
  -v "$TEST_DIR/nginx.conf:/etc/nginx/nginx.conf:ro" \
  -v "$TEST_DIR/conf.d:/etc/nginx/conf.d:ro" \
  -v "$TEST_DIR/certs:/etc/nginx/certs:ro" \
  nginx:1.28-alpine nginx -t
```

**Expected output:** the temporary Nginx syntax test succeeds.

Remove the temporary directory after the test:

```bash
rm -r "/tmp/carta-nginx-test-${STAMP}"
```

### 12.3 Activate the tested proposal

**Run on EC2:**

```bash
STAMP=REPLACE_WITH_THE_TIMESTAMP_FROM_THE_PREVIOUS_STEP
mv /opt/carta-nginx/conf.d/carta-tls.conf \
  "/opt/carta-nginx/conf.d/carta-tls.conf.previous-${STAMP}"
mv "/opt/carta-nginx/conf.d/carta-tls.conf.proposed-${STAMP}" \
  /opt/carta-nginx/conf.d/carta-tls.conf

docker exec carta-nginx nginx -t
docker exec carta-nginx nginx -s reload
```

If `nginx -t` fails, do not reload.

### 12.4 Roll back immediately

**Run on EC2:**

```bash
STAMP=REPLACE_WITH_THE_TIMESTAMP_FROM_STEP_12_3
if ! test -e \
  "/opt/carta-nginx/conf.d/carta-tls.conf.previous-${STAMP}"; then
  echo "Rollback source is missing" >&2
  exit 1
fi

mv /opt/carta-nginx/conf.d/carta-tls.conf \
  "/opt/carta-nginx/conf.d/carta-tls.conf.failed-${STAMP}"
mv "/opt/carta-nginx/conf.d/carta-tls.conf.previous-${STAMP}" \
  /opt/carta-nginx/conf.d/carta-tls.conf

docker exec carta-nginx nginx -t
docker exec carta-nginx nginx -s reload
curl -k -fsS https://127.0.0.1/test
```

This restores the previous configuration without overwriting either file.

## 13. Completion checklist

- [ ] `redis`, `backend`, and `frontend` are healthy in
      `docker-compose.ecr.yml`.
- [ ] Backend is bound to `127.0.0.1:8000`.
- [ ] Frontend is bound to `127.0.0.1:3000`.
- [ ] Redis has no public host port.
- [ ] `carta-nginx` is running with `restart: unless-stopped`.
- [ ] Nginx owns host ports `80` and `443`.
- [ ] Security group exposes `80` and `443`.
- [ ] Security group does not expose `3000`, `8000`, or `6379`.
- [ ] `/api/*` routes to FastAPI.
- [ ] `/ws/transcribe` supports WebSocket upgrades.
- [ ] `/test` confirms the backend through Nginx.
- [ ] All other browser paths route to Next.js.
- [ ] `NEXT_PUBLIC_API_URL` is the same-origin Nginx URL and the frontend image
      was rebuilt.
- [ ] `FRONTEND_ORIGIN` matches the exact HTTPS browser origin.
- [ ] `CLERK_AUTHORIZED_PARTIES` and the Clerk dashboard allow the exact HTTPS
      origin used.
- [ ] A direct public request to port `3000` fails.
- [ ] A direct public request to port `8000` fails.
- [ ] HTTP redirects to HTTPS.
- [ ] HTTPS works with the expected browser warning for the self-signed
      certificate.
- [ ] Nginx, frontend, backend, and Redis logs were checked.
- [ ] A timestamped Nginx backup exists before every configuration change.

