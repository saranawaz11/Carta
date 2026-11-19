# Carta: Local, ECR, and EC2 Deployment

This runbook deploys the complete Carta application:

- Next.js frontend on port `3000`
- FastAPI backend on port `8000`
- Redis in a private Docker network
- PostgreSQL with `pgvector` hosted outside EC2, for example in Neon

The application uses an external PostgreSQL database. It does not run
PostgreSQL in Docker Compose. Database schema changes must be applied with
Alembic.

> Do not commit `.env` files. They are ignored by Git. Never put the Clerk
> secret, OpenAI key, database password, or AWS credentials in a Docker build
> argument or image.

## 1. Architecture and required values

Prepare these values before deployment:

| Value | Example | Notes |
| --- | --- | --- |
| AWS account ID | `123456789012` | Used in ECR image URLs |
| AWS region | `ap-south-1` | Use the same region for ECR and EC2 |
| Backend ECR repository | `carta-backend` | Private repository |
| Frontend ECR repository | `carta-frontend` | Private repository |
| Image tag | `v1.0.0` | Use a new tag for each release |
| EC2 public hostname or IP | `203.0.113.10` | Prefer an Elastic IP or domain |
| PostgreSQL URL | `postgresql://...` | Must support the `vector` extension |
| Clerk issuer | `https://...clerk.accounts.com` | From the Clerk application |
| Clerk publishable/secret keys | `pk_...`, `sk_...` | Keep the secret private |
| OpenAI API key | `sk-...` | Used for embeddings, chat, and voice |

Ports used by the application:

| Service | Host port | Publicly required? |
| --- | --- | --- |
| Next.js frontend | 3000 | Yes for direct HTTP/IP deployment |
| FastAPI backend | 8000 | Yes for direct HTTP/IP deployment |
| Redis | 6379 | No; it remains internal to Docker |

For a real production deployment, use a domain and HTTPS. Browser microphone
access requires a secure context, and plain HTTP on an EC2 IP is not suitable
for production voice input. A domain also avoids rebuilding the frontend
whenever an EC2 public IP changes.

## 2. Local workstation prerequisites

Install:

- Git
- Docker Desktop (Windows/macOS) or Docker Engine and Compose (Linux)
- AWS CLI v2
- An AWS user with permission to use ECR
- A Git repository URL and either HTTPS access or an SSH key
- Clerk, OpenAI, and PostgreSQL credentials

Verify them:

```powershell
git --version
docker --version
docker compose version
aws --version
```

Configure the AWS CLI if this workstation has not used AWS before:

```powershell
aws configure
aws sts get-caller-identity
```

## 3. Clone the source code

Run this once on the workstation:

```powershell
Set-Location $HOME
git clone https://github.com/saranawaz11/Carta.git
Set-Location .\Carta
git switch main
git pull --ff-only
```

For a private clone that uses SSH:

```powershell
git clone git@github.com:saranawaz11/Carta.git
```

## 4. Configure local environment files

Create the files only if they do not exist:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
if (-not (Test-Path backend\.env)) { Copy-Item backend\.env.example backend\.env }
```

Edit the root `.env`:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_or_pk_live_value
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
CLERK_SECRET_KEY=sk_test_or_sk_live_value

# Local image defaults are optional. The ECR section below adds ECR URLs here.
BACKEND_REPO=carta-backend
FRONTEND_REPO=carta-frontend
IMAGE_TAG=v1.0.0
```

Edit `backend/.env`:

```dotenv
REDIS_URL=redis://redis:6379/0
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require

CLERK_ISSUER=https://your-clerk-instance.clerk.accounts.com
CLERK_AUTHORIZED_PARTIES=http://localhost:3000,http://127.0.0.1:3000
FRONTEND_ORIGIN=http://localhost:3000,http://127.0.0.1:3000

OPENAI_API_KEY=your_openai_key
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_CHAT_MODEL=gpt-4o-mini
OPENAI_TRANSCRIBE_MODEL=gpt-4o-transcribe
VOICE_VAD_THRESHOLD=0.4
VOICE_SILENCE_MS=1000
```

`NEXT_PUBLIC_*` values are embedded into the frontend JavaScript during the
image build. Restarting the container cannot change them; the frontend image
must be rebuilt and republished whenever one changes.

The root Docker Compose file overrides `REDIS_URL` with
`redis://redis:6379/0`, which is the name Redis uses on the Compose network.

## 5. Run Carta locally

Run all commands from the repository root.

Validate the Compose configuration without printing the resolved secrets:

```powershell
docker compose config --quiet
```

Build the frontend and backend:

```powershell
docker compose build
```

Start Redis and run database migrations:

```powershell
docker compose up -d redis
docker compose run --rm --no-deps backend alembic upgrade head
```

Start the full application:

```powershell
docker compose up -d
docker compose ps
```

Open:

- Frontend: <http://localhost:3000>
- Backend health: <http://localhost:8000/test>
- FastAPI docs: <http://localhost:8000/docs>

Check logs:

```powershell
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f redis
```

Useful local lifecycle commands:

```powershell
# Stop and retain containers and the Redis volume.
docker compose stop

# Start existing containers again.
docker compose start

# Remove containers and networks, but retain the named Redis volume.
docker compose down

# Rebuild after source or NEXT_PUBLIC_* changes.
docker compose up -d --build
```

Do not run `docker compose down -v` unless intentionally deleting Redis data.

## 6. Create the ECR repositories

The following PowerShell commands create two private ECR repositories. They
are idempotent when the repositories already exist.

```powershell
$AWS_REGION = "ap-south-1"
$AWS_ACCOUNT_ID = (aws sts get-caller-identity --query Account --output text).Trim()
$ECR_REGISTRY = "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

aws ecr describe-repositories `
  --region $AWS_REGION `
  --repository-names carta-backend *> $null
if ($LASTEXITCODE -ne 0) {
  aws ecr create-repository `
    --region $AWS_REGION `
    --repository-name carta-backend `
    --image-scanning-configuration scanOnPush=true
}

aws ecr describe-repositories `
  --region $AWS_REGION `
  --repository-names carta-frontend *> $null
if ($LASTEXITCODE -ne 0) {
  aws ecr create-repository `
    --region $AWS_REGION `
    --repository-name carta-frontend `
    --image-scanning-configuration scanOnPush=true
}

$env:BACKEND_REPO = "$ECR_REGISTRY/carta-backend"
$env:FRONTEND_REPO = "$ECR_REGISTRY/carta-frontend"
$env:IMAGE_TAG = "v1.0.0"

aws ecr describe-repositories --region $AWS_REGION `
  --repository-names carta-backend carta-frontend
```

The checks create each repository only when it is absent. If
`describe-repositories` fails, resolve the AWS IAM or region error before
continuing.

For an IAM user building images locally, grant only the ECR permissions that
the user needs. Avoid `AdministratorAccess`. A standard minimum build workflow
needs repository authorization, image layer upload, and image manifest
operations for these two repositories.

## 7. Authenticate Docker to ECR

```powershell
$ECR_PASSWORD = aws ecr get-login-password --region $AWS_REGION
$ECR_PASSWORD | docker login `
  --username AWS `
  --password-stdin `
  $ECR_REGISTRY
```

The token expires after 12 hours. Log in again after a token expiry.

## 8. Choose the frontend URL before building its production image

The frontend must be built with a URL that the user's browser can reach.
Container names such as `backend:8000` cannot be used in `NEXT_PUBLIC_API_URL`.

Preferred:

```text
https://api.yourdomain.com
```

Direct-IP testing:

```text
http://EC2_PUBLIC_IP:8000
```

If the EC2 public IP is not yet known, complete the EC2 steps using an Elastic
IP, return to this section, then build and push the frontend with that stable
IP. The backend image is independent of the EC2 IP.

For a direct-IP test, set these build values in the workstation shell:

```powershell
$env:NEXT_PUBLIC_API_URL = "http://203.0.113.10:8000"
$env:NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_or_pk_live_value"
$env:NEXT_PUBLIC_CLERK_SIGN_IN_URL = "/sign-in"
$env:NEXT_PUBLIC_CLERK_SIGN_UP_URL = "/sign-up"
```

Use real values rather than the examples above.

## 9. Build, tag, and push both images

From the repository root:

```powershell
docker build `
  -t "$env:BACKEND_REPO`:$env:IMAGE_TAG" `
  ./backend

docker build `
  -t "$env:FRONTEND_REPO`:$env:IMAGE_TAG" `
  --build-arg NEXT_PUBLIC_API_URL="$env:NEXT_PUBLIC_API_URL" `
  --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="$env:NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" `
  --build-arg NEXT_PUBLIC_CLERK_SIGN_IN_URL="$env:NEXT_PUBLIC_CLERK_SIGN_IN_URL" `
  --build-arg NEXT_PUBLIC_CLERK_SIGN_UP_URL="$env:NEXT_PUBLIC_CLERK_SIGN_UP_URL" `
  ./frontend
```

Push:

```powershell
docker push "$env:BACKEND_REPO`:$env:IMAGE_TAG"
docker push "$env:FRONTEND_REPO`:$env:IMAGE_TAG"

aws ecr describe-images `
  --region $AWS_REGION `
  --repository-name carta-backend `
  --image-ids imageTag=$env:IMAGE_TAG

aws ecr describe-images `
  --region $AWS_REGION `
  --repository-name carta-frontend `
  --image-ids imageTag=$env:IMAGE_TAG
```

If the frontend URL or Clerk publishable key changes, rebuild and push the
frontend. Merely changing the EC2 `.env` does not update the browser bundle.

## 10. Create the EC2 IAM role

In the AWS IAM console:

1. Create a role for the `EC2` trusted entity.
2. Attach the managed policy
   `AmazonEC2ContainerRegistryReadOnly`.
3. Name it `carta-ec2-ecr-pull-role`.
4. Do not attach ECR write, Secrets Manager, or administrator permissions
   unless another documented requirement needs them.

The EC2 instance profile can then pull the private images without storing
long-lived AWS keys on the server.

## 11. Create the Linux EC2 instance

In the EC2 console:

1. Choose **Amazon Linux 2023**.
2. Select an instance in the same region as the ECR repositories.
3. Use `t3.small` (2 GB RAM) or larger for a small deployment. For consistent
   builds, testing, or larger AI workloads, prefer `t3.medium` or greater.
4. Create or choose an EC2 key pair (`.pem` file).
5. Attach the `carta-ec2-ecr-pull-role` IAM instance profile.
6. Use a `gp3` root volume of at least 20 GB.
7. Create a security group with:
   - TCP `22` from your current public IP only
   - TCP `3000` from `0.0.0.0/0` for temporary direct-IP frontend testing
   - TCP `8000` from `0.0.0.0/0` for temporary direct-IP backend testing
8. Keep outbound access enabled to the internet so the instance can reach ECR,
   PostgreSQL, Clerk, and OpenAI.
9. Launch the instance and associate an Elastic IP if the address must remain
   stable.

After HTTPS and a reverse proxy are configured, remove direct public access to
ports 3000 and 8000 and expose only ports 80/443.

## 12. Connect to EC2 over SSH

On PowerShell, protect the private key:

```powershell
cd $HOME\Downloads
icacls.exe .\carta-key.pem /inheritance:r
icacls.exe .\carta-key.pem /grant:r "$($env:USERNAME):(R)"
```

Connect, replacing the key and address:

```powershell
ssh -i "$HOME\Downloads\carta-key.pem" `
  ec2-user@203.0.113.10
```

Accept the host fingerprint after verifying the EC2 address. If SSH times out,
check that port 22 is allowed from the workstation's current public IP and that
the instance is running.

## 13. Install Docker, Git, AWS CLI, and Compose on EC2

Run on Amazon Linux 2023:

```bash
sudo dnf update -y
sudo dnf install -y docker git unzip
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user
```

Confirm AWS CLI:

```bash
aws --version
```

If `aws` is missing, install AWS CLI v2:

```bash
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64) AWSCLI_ARCH=x86_64 ;;
  aarch64) AWSCLI_ARCH=aarch64 ;;
  *) echo "Unsupported architecture: $ARCH" >&2; exit 1 ;;
esac

curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-${AWSCLI_ARCH}.zip" \
  -o /tmp/awscliv2.zip
cd /tmp
unzip -q awscliv2.zip
sudo ./aws/install
cd ~
```

Install Docker Compose v2:

```bash
if ! sudo dnf install -y docker-compose-plugin; then
  sudo mkdir -p /usr/local/lib/docker/cli-plugins
  ARCH="$(uname -m)"
  COMPOSE_VERSION="$(
    curl -fsSL https://api.github.com/repos/docker/compose/releases/latest |
      sed -n 's/.*"tag_name": "\([^"]*\)".*/\1/p' |
      head -n 1
  )"
  test -n "$COMPOSE_VERSION" || {
    echo "Unable to determine the Docker Compose version" >&2
    exit 1
  }
  sudo curl -fL \
    "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-${ARCH}" \
    -o /usr/local/lib/docker/cli-plugins/docker-compose
  sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
fi
```

Log out and reconnect for Docker group membership:

```bash
exit
```

Reconnect with the SSH command, then verify:

```bash
docker --version
docker compose version
aws --version
docker info
```

The attached IAM role is verified by:

```bash
aws sts get-caller-identity
```

## 14. Pull the Carta repository onto EC2

For a public repository:

```bash
cd ~
git clone https://github.com/saranawaz11/Carta.git
cd Carta
git switch main
git pull --ff-only
```

For a private repository, install a read-only deploy key in `~/.ssh`, add it to
the Git provider, and use the SSH URL:

```bash
git clone git@github.com:saranawaz11/Carta.git
```

Do not use a personal, long-lived GitHub token in the Git URL.

## 15. Create the EC2 environment files

From `~/Carta`, create the files:

```bash
test -f .env || cp .env.example .env
test -f backend/.env || cp backend/.env.example backend/.env
chmod 600 .env backend/.env
```

Edit `.env`:

```bash
nano .env
```

Use:

```dotenv
NEXT_PUBLIC_API_URL=http://203.0.113.10:8000
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_or_pk_live_value
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
CLERK_SECRET_KEY=sk_test_or_sk_live_value

AWS_REGION=ap-south-1
BACKEND_REPO=123456789012.dkr.ecr.ap-south-1.amazonaws.com/carta-backend
FRONTEND_REPO=123456789012.dkr.ecr.ap-south-1.amazonaws.com/carta-frontend
IMAGE_TAG=v1.0.0
```

The `NEXT_PUBLIC_*` values here describe the deployed configuration, but they
do not modify an already-built frontend image. They must match the values used
when the image was built.

Edit `backend/.env`:

```bash
nano backend/.env
```

Use:

```dotenv
REDIS_URL=redis://redis:6379/0
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require

CLERK_ISSUER=https://your-clerk-instance.clerk.accounts.com
CLERK_AUTHORIZED_PARTIES=http://203.0.113.10:3000
FRONTEND_ORIGIN=http://203.0.113.10:3000

OPENAI_API_KEY=your_openai_key
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_CHAT_MODEL=gpt-4o-mini
OPENAI_TRANSCRIBE_MODEL=gpt-4o-transcribe
VOICE_VAD_THRESHOLD=0.4
VOICE_SILENCE_MS=1000
```

The following values must represent the exact browser origin:

- `FRONTEND_ORIGIN`
- `CLERK_AUTHORIZED_PARTIES`
- Clerk's allowed/authorized origin configuration

Do not add a trailing slash unless the corresponding application configuration
requires it. When HTTPS is used, use `https://` consistently.

Protect and validate the files:

```bash
chmod 600 .env backend/.env
docker compose -f docker-compose.ecr.yml config --quiet
```

## 16. Pull the ECR images on EC2

Load the deployment values:

```bash
cd ~/Carta
set -a
source .env
set +a
```

Authenticate Docker:

```bash
ECR_REGISTRY="${BACKEND_REPO%%/*}"

aws ecr get-login-password --region "$AWS_REGION" |
  docker login --username AWS --password-stdin "$ECR_REGISTRY"
```

Pull the exact image tag:

```bash
docker compose -f docker-compose.ecr.yml pull
docker compose -f docker-compose.ecr.yml images
```

If ECR returns `no basic auth credentials`, rerun the login command. If it
returns access denied, confirm the IAM instance profile and inspect that the
role has `AmazonEC2ContainerRegistryReadOnly`.

## 17. Apply database migrations

Start Redis:

```bash
docker compose -f docker-compose.ecr.yml up -d redis
```

Run migrations with the backend image:

```bash
docker compose -f docker-compose.ecr.yml run --rm --no-deps \
  backend alembic upgrade head
```

Confirm the current revision:

```bash
docker compose -f docker-compose.ecr.yml run --rm --no-deps \
  backend alembic current
```

The initial migrations create the schema and enable the PostgreSQL `vector`
extension. The database user therefore needs permission to enable extensions.
For managed PostgreSQL providers, enable `pgvector` through that provider if the
SQL `CREATE EXTENSION` statement is restricted.

## 18. Start and verify Carta on EC2

Start all services:

```bash
docker compose -f docker-compose.ecr.yml up -d
docker compose -f docker-compose.ecr.yml ps
```

Test from the EC2 host:

```bash
curl -fsS http://127.0.0.1:8000/test
curl -I http://127.0.0.1:3000/
```

From the workstation, open:

- Frontend: <http://203.0.113.10:3000>
- Backend health: <http://203.0.113.10:8000/test>

Or test from PowerShell:

```powershell
curl.exe -fsS http://203.0.113.10:8000/test
curl.exe -I http://203.0.113.10:3000/
```

Inspect running services and logs:

```bash
docker compose -f docker-compose.ecr.yml ps
docker compose -f docker-compose.ecr.yml logs --tail=200 backend
docker compose -f docker-compose.ecr.yml logs --tail=200 frontend
docker compose -f docker-compose.ecr.yml logs --tail=200 redis
```

Then sign in and test notes, folders, tasks, chat, and voice. The health check
only proves that the web process responds; it does not validate PostgreSQL,
Clerk, or OpenAI.

## 19. Install the application for automatic restart

All three services use `restart: unless-stopped`, and Docker starts after a
reboot because it is enabled:

```bash
sudo systemctl enable docker
sudo systemctl is-enabled docker
```

To intentionally stop and later resume:

```bash
docker compose -f docker-compose.ecr.yml stop
docker compose -f docker-compose.ecr.yml start
```

Do not use `down -v`; that deletes the named Redis volume.

## 20. Deploy a new release

On the workstation:

1. Pull the latest code.
2. Choose a new unique `IMAGE_TAG`; do not reuse a production tag.
3. Build with the correct `NEXT_PUBLIC_*` values.
4. Push both images.

Example:

```powershell
git pull --ff-only
$env:IMAGE_TAG = "v1.0.1"

docker build -t "$env:BACKEND_REPO`:$env:IMAGE_TAG" ./backend
docker build `
  -t "$env:FRONTEND_REPO`:$env:IMAGE_TAG" `
  --build-arg NEXT_PUBLIC_API_URL="$env:NEXT_PUBLIC_API_URL" `
  --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="$env:NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" `
  --build-arg NEXT_PUBLIC_CLERK_SIGN_IN_URL="$env:NEXT_PUBLIC_CLERK_SIGN_IN_URL" `
  --build-arg NEXT_PUBLIC_CLERK_SIGN_UP_URL="$env:NEXT_PUBLIC_CLERK_SIGN_UP_URL" `
  ./frontend

docker push "$env:BACKEND_REPO`:$env:IMAGE_TAG"
docker push "$env:FRONTEND_REPO`:$env:IMAGE_TAG"
```

On EC2:

```bash
cd ~/Carta
git pull --ff-only

nano .env
# Change IMAGE_TAG=v1.0.1

set -a
source .env
set +a

ECR_REGISTRY="${BACKEND_REPO%%/*}"
aws ecr get-login-password --region "$AWS_REGION" |
  docker login --username AWS --password-stdin "$ECR_REGISTRY"

docker compose -f docker-compose.ecr.yml pull
docker compose -f docker-compose.ecr.yml run --rm --no-deps \
  backend alembic upgrade head
docker compose -f docker-compose.ecr.yml up -d
docker compose -f docker-compose.ecr.yml ps
```

If a migration is destructive or incompatible, take a database backup and
define a rollback plan before this sequence.

## 21. Production HTTPS and domain

Direct-IP HTTP is enough for an initial connectivity test, but production should
use HTTPS and domain names:

- `https://carta.example.com` for the frontend
- `https://api.example.com` for the backend

Complete the change in this order:

1. Create DNS A records for both hostnames pointing to the Elastic IP.
2. Use an HTTPS reverse proxy/load balancer that supports WebSockets.
3. Route frontend traffic to port 3000 and API traffic to port 8000.
4. Issue trusted TLS certificates.
5. Update Clerk allowed origins and redirect URLs.
6. Set:
   - `NEXT_PUBLIC_API_URL=https://api.example.com`
   - `FRONTEND_ORIGIN=https://carta.example.com`
   - `CLERK_AUTHORIZED_PARTIES=https://carta.example.com`
7. Rebuild and push the frontend because its public values changed.
8. Deploy the new image and replace `backend/.env`.
9. Remove public access to ports 3000 and 8000.
10. Keep ports 80 and 443 public as required by the proxy.

The proxy must forward WebSocket upgrade headers for voice input and long-lived
streaming chat responses. Do not route only static frontend requests.

## 22. Optional system housekeeping

### Daily cleanup of completed tasks

The repository contains a cleanup command for completed tasks:

```bash
docker compose -f docker-compose.ecr.yml run --rm --no-deps \
  backend python scripts/cleanup_completed_tasks.py
```

Schedule it only after confirming the intended retention behavior, and monitor
non-zero exits.

### Remove old local Docker objects

On EC2, preview disk use:

```bash
docker system df
docker image ls
```

After confirming that active release tags are not affected:

```bash
docker image prune -f
```

Do not prune all volumes because Redis persistence is stored in a named volume.

## 23. Troubleshooting

### Frontend starts but cannot call the backend

Check:

```bash
curl -v http://127.0.0.1:8000/test
docker compose -f docker-compose.ecr.yml logs --tail=200 backend
docker compose -f docker-compose.ecr.yml exec frontend \
  node -e "console.log(process.env.CLERK_SECRET_KEY ? 'Clerk secret is set' : 'Clerk secret is missing')"
```

Also verify in a browser:

- `NEXT_PUBLIC_API_URL` is public-host reachable, not `localhost` on the
  viewer's computer and not a Docker container name.
- The security group allows 8000 for the direct-IP setup.
- `FRONTEND_ORIGIN` and `CLERK_AUTHORIZED_PARTIES` exactly match the browser
  origin.

### Frontend reports that Clerk or the API URL is missing

The image stores `NEXT_PUBLIC_*` at build time. Confirm the build arguments,
rebuild, push, pull, and recreate the frontend container:

```bash
docker compose -f docker-compose.ecr.yml up -d --force-recreate frontend
```

### Backend reports database or `vector` errors

Verify `DATABASE_URL` without printing it, confirm outbound database access,
then run:

```bash
docker compose -f docker-compose.ecr.yml run --rm --no-deps \
  backend alembic upgrade head
```

If extension creation is denied, enable `pgvector` through the PostgreSQL
provider's supported method.

### Containers are `unhealthy`

```bash
docker compose -f docker-compose.ecr.yml ps
docker compose -f docker-compose.ecr.yml logs --tail=300 backend frontend redis
```

Inspect a service container selected by Compose:

```bash
docker inspect "$(docker compose -f docker-compose.ecr.yml ps -q redis)"
docker inspect "$(docker compose -f docker-compose.ecr.yml ps -q backend)"
docker inspect "$(docker compose -f docker-compose.ecr.yml ps -q frontend)"
```

### ECR pull is denied on EC2

```bash
aws sts get-caller-identity
aws ecr describe-repositories --region ap-south-1
```

Confirm the ECR repositories exist in the same region and the EC2 role is
actually attached in the instance's **Security > IAM role** details.

### The application works on localhost but not from a remote browser

Common causes:

- `NEXT_PUBLIC_API_URL` still contains `localhost`
- EC2 public ports are missing from the security group
- The EC2 instance has no public/Elastic IP
- CORS origins still contain only localhost
- Clerk does not authorize the EC2/domain origin
- Voice is being used from insecure HTTP instead of HTTPS

## 24. Security checklist

- Keep SSH port 22 restricted to trusted source IPs.
- Never publish Redis port 6379.
- Never commit `.env` files or copy AWS access keys to EC2.
- Use an EC2 IAM instance profile rather than access keys for ECR.
- Rotate Clerk, OpenAI, and database credentials if exposed.
- Restrict the database provider to trusted source addresses where possible.
- Use HTTPS before handling real users.
- Do not expose FastAPI port 8000 publicly after installing a reverse proxy.
- Use unique image tags and record the deployed tag.
- Back up PostgreSQL before release migrations.
- Review ECR image scan results after each push.
