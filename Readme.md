# Fleet App — End-to-End DevOps, DevSecOps & GitOps Learning Lab

A hands-on, production-style CI/CD and GitOps reference project built with **TypeScript**, **TanStack Start**, and **Vite**, designed to master modern cloud-native delivery from local containerization to automated Kubernetes deployment.

---

## Architecture & Delivery Lifecycle

```text
┌───────────────────┐     ┌───────────────────────────────────────────┐     ┌─────────────────────────┐
│   GitHub /        │     │           Azure DevOps Pipelines          │     │  Azure Container        │
│   Azure Repos     │────▶│  1. Matrix Tests (Node + Redis Sidecar)   │────▶│  Registry (ACR)         │
│   (main / PR)     │     │  2. DevSecOps Scan & Image Audit          │     │  fleet-app:<BuildId>    │
└───────────────────┘     │  3. Docker Build & Push                   │     └────────────┬────────────┘
                          └───────────────────────────────────────────┘                  │
                                                                                         │ Image Pull
                          ┌───────────────────────────────────────────┐                  ▼
                          │         GitOps & Kubernetes (ArgoCD)      │     ┌─────────────────────────┐
                          │  • Watches Kubernetes Manifests Repo      │────▶│  Kubernetes Cluster /   │
                          │  • Auto-Syncs Desired State & Self-Heals  │     │  Self-Hosted Runtime    │
                          └───────────────────────────────────────────┘     └─────────────────────────┘
```

---

## Tech Stack & Core Learning Pillars

| Domain | Technologies & Concepts Covered |
| :--- | :--- |
| **Application Stack** | TypeScript, TanStack Start, Vite, Nitro (`node-server` preset), Node.js |
| **Containerization** | Multi-stage builds (`test.Dockerfile`), BuildKit optimization, health checks, non-root runtime practices |
| **Azure DevOps CI/CD** | Multi-stage YAML pipelines, self-hosted Linux agents, matrix strategies (`maxParallel`), container jobs, sidecar services (`redis`), `target: host` overrides, deployment jobs, and Environments |
| **Artifact Management** | Azure Container Registry (ACR), Service Connections, Microsoft Entra ID & B2B Guest RBAC, automated image tagging (`$(Build.BuildId)` + `latest`) |
| **DevSecOps** | Shift-left dependency auditing (`npm audit`), container vulnerability scanning (Trivy), manual approval & skippable audit gates, secret masking, and `always()` registry logout hygiene |
| **Kubernetes & GitOps** | Kubernetes Deployments, Services, ConfigMaps/Secrets, and declarative continuous delivery via **ArgoCD** |

---

## Repository Structure

```text
├── src/                      # TypeScript + TanStack Start application source
├── test.Dockerfile           # Multi-stage production Dockerfile (Nitro node-server on port 3000)
├── azure-pipelines.yml       # Enterprise multi-stage CI/CD pipeline (Matrix CI, Audit, ACR, CD)
├── k8s/                      # (Optional/Next) Kubernetes Deployment & Service manifests for ArgoCD
└── README.md                 # Project architecture, setup, and learning guide
```

---

## 1. Docker (Multi-Stage Containerization)

The application is packaged using `test.Dockerfile` with multi-stage builds to keep the production image lightweight and secure:
* **Build Stage:** Installs dependencies, runs type checks/tests, and compiles the TanStack Start server bundle with `NITRO_PRESET=node-server`.
* **Runtime Stage:** Copies only the compiled `.output` directory into a clean Node.js runtime image and starts the server on port `3000` via `CMD ["node", ".output/server/index.mjs"]`.

### Run Locally with Docker
```bash
# Build the image
docker build -f test.Dockerfile -t fleet-app:local .

# Run the container on port 3000
docker run -d --name fleet-app-local -p 3000:3000 fleet-app:local

# Verify HTTP health
curl -I http://localhost:3000
```

---

## 2. Azure DevOps CI/CD Pipeline (`azure-pipelines.yml`)

The pipeline demonstrates enterprise YAML features across three structured stages:

1. **`CI_Stage` (Validation & ACR Push)**
   * **Parallel Matrix Testing (`MatrixTestJob`):** Runs tests across multiple Node targets (`Node20_Env`, `Node22_Env`) inside an isolated `node:22-bookworm-slim` container paired with a `redis:7-alpine` sidecar service.
   * **Host-Targeted Docker Build (`DockerBuildAndPushJob`):** Breaks out to the host agent (`target: host`) using `Docker@2` (`command: buildAndPush`) to build `test.Dockerfile` and push immutable `<BuildId>` and `latest` tags to Azure Container Registry.
   * **Concurrency Control:** Uses `lockBehavior: runLatest` to cancel superseded queued CI builds when rapid commits arrive.
2. **`Security_Audit_Stage` (Optional DevSecOps Gate)**
   * Configured with `trigger: manual` and `isSkippable: true` so teams can inspect image metadata, run CVE scans, or bypass the gate during urgent hotfixes without breaking downstream deployment conditions.
3. **`CD_Stage` (Continuous Delivery)**
   * Uses a `deployment:` job targeting an Azure DevOps **Environment** (`SelfHosted-PC`) with `lockBehavior: sequential` and `runOnce` lifecycle hooks to pull the verified ACR image, replace the running container cleanly, and validate HTTP availability.

---

## 3. DevSecOps Practices Implemented

* **Zero Hardcoded Credentials:** All registry logins use Azure DevOps **Service Connections** (`ACR-ServiceConnection`) backed by Microsoft Entra ID or scoped registry credentials, followed by a `condition: always()` `logout` step.
* **Branch & PR Isolation:** Pull Requests (`pr: main`) execute full CI matrix validation and image builds while strictly blocking `CD_Stage` deployments unless the commit originates from `refs/heads/main`.
* **Shift-Left Container & Dependency Scanning:** Designed to integrate `npm audit` and **Trivy** image vulnerability checks inside `CI_Stage` / `Security_Audit_Stage` prior to production rollout.
* **Immutable Image Tagging:** Every build is tagged with `$(Build.BuildId)` so deployments remain traceable to an exact Git commit and pipeline run.

---

## 4. Kubernetes & ArgoCD GitOps Workflow

To transition from single-host Docker deployment to declarative **Kubernetes + ArgoCD** delivery:

1. **CI Pipeline Updates Image Tag:** After pushing `fleet-app:<BuildId>` to ACR, the CI pipeline updates the image tag in the Kubernetes manifest (`k8s/deployment.yaml`) or Helm `values.yaml`.
2. **ArgoCD Continuous Reconciliation:**
   * ArgoCD monitors the Git repository containing the Kubernetes manifests.
   * When a new image tag is committed, ArgoCD detects the `OutOfSync` state and automatically applies the updated `Deployment` and `Service` to the cluster.
   * **Self-Healing & Rollbacks:** Any manual drift on the cluster is automatically reverted by ArgoCD, and rolling back to a previous release requires only a `git revert`.

### Example Kubernetes Deployment (`k8s/deployment.yaml`)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fleet-app
  labels:
    app: fleet-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: fleet-app
  template:
    metadata:
      labels:
        app: fleet-app
    spec:
      containers:
        - name: fleet-app
          image: <acr-name>.azurecr.io/fleet-app:latest
          ports:
            - containerPort: 3000
          readinessProbe:
            httpGet:
              path: /
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 10
```

---

## Prerequisites & Setup Checklist

- [x] **Self-Hosted Linux Agent** registered in Azure DevOps (`default` pool) with Docker Engine installed.
- [x] **Azure Container Registry (ACR)** created in Azure Portal.
- [x] **Service Connection** (`ACR-ServiceConnection`) configured in Azure DevOps Project Settings.
- [x] **Azure DevOps Environment** (`SelfHosted-PC`) created under **Pipelines → Environments**.
- [ ] **Kubernetes Cluster & ArgoCD** installed for declarative GitOps rollouts.
