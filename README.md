# 🌩️ Floci Manager

> **The ultimate visual local cockpit for the Floci.io Cloud Emulator.**  
> Effortlessly monitor, trigger, and orchestrate serverless resources, database structures, security protocols, containerized tasks, and multi-tier architectural pipelines.

---

## 👁️ Overview

**Floci Manager** is a rich, responsive, and beautifully designed AWS Management Console emulation suite specifically tailored for the **Floci.io** sandbox and local emulator networks. 

By mimicking the real-world AWS Console experience and supplementing it with specialized orchestration tools, Floci Manager provides engineers with an instantaneous, single-pane-of-glass overview of their local microservice environments. 

It goes beyond basic configuration monitoring by offering an **Autoinstall Software Marketplace** that dynamically compiles Infrastructure-as-Code (IaC) templates, processes multi-stage Docker builds, configures reverse-proxy tables, and provisions actual resources within the emulator’s backend.

---

## 🛠️ Unified AWS Service Suite

Floci Manager bundles custom control views for a massive variety of essential AWS components, split into logical cloud paradigms:

| Category | Service Components Included | Emulated Functions & Operations |
| :--- | :--- | :--- |
| **Compute & Containers** | ⚡ `Lambda`, `ECS`, `ECR`, `Elastic Beanstalk`, `AWS Batch` | Function triggers, task definition registers, container registry logs, live application environments, high-performance batch job dispatch |
| **Databases & Analytics**| 🗄️ `RDS`, `DynamoDB`, `Athena`, `Glue`, `ElastiCache`, `Redshift`, `Neptune`, `OpenSearch`, `MSK` | Table schemas, database clusters, key-value stores, query history, crawler runs, analytic clusters, property graph query panels, search indexing logs, Kafka stream queues |
| **Security & Identity**  | 🔑 `IAM`, `Cognito`, `ACM`, `KMS`, `Secrets Manager`, `IAM Identity Center` | User pools, credential rotations, SSL certificates, encryption policies, access keys, SSO identity directory mapping and group permissions |
| **Networking & Routing** | 🌐 `VPC`, `Route 53`, `API Gateway`, `AppSync`, `Transit Gateway` | Subnet distributions, zone configurations, REST APIs, GraphQL structures, hub-and-spoke multi-VPC routers |
| **Messaging & Events**  | 📨 `SNS`, `SQS`, `EventBridge`, `SES` | Topic subscriptions, queue polling, cron triggers, secure mail deliveries |
| **Security & Ingress**   | 🛡️ `WAF`, `ACM` | Web ACL filtering rules, regional rate limits, secure SSL parameters |
| **CI/CD & DevOps**      | 🏗️ `CodeBuild`, `CodePipeline`, `CodeArtifact` | Continuous pipeline runs, environment configurations, asset repositories |
| **Observability & Files**| 📂 `EFS File Systems`, `CloudWatch`, `CloudTrail` | Network share states, log aggregates, administrative compliant operation auditing |

---

## ⚡ Next-Generation Capabilities Highlight

### 🔍 Interactive Sidebar Filtering
Floci Manager now includes an instantaneous, stateful search input located in the sidebar workspace. Typing instantly filters computing, storage, networking, database, analytics, identity, and integration categories, including all individual items. Static administrative hubs such as the *Software Marketplace* and *Event Stream* adjust alongside searches so you can locate complex control suites within a split-second.

### 📊 Dynamic Diagnostics & Real Telemetry
All status panels have been updated to present real, contextually active telemetry instead of rigid placeholders:
* **True Memory Tracking**: Directly query your browser's JS Heap Memory footprint (`window.performance.memory`) or calculate active DOM allocation loads with lightweight micro-oscillations, displaying high-fidelity live overhead statistics.
* **Environment-Bound Headers**: Header displays dynamically retrieve location hostnames and network bounds, showing whether you are currently hosted inside `GCP_CLOUD_RUN`, `LOCAL_DEV_POD`, or general sandbox nodes.
* **Audit Merging**: Modernized the CloudTrail engine to automatically aggregate simulated administrative triggers alongside live, contextually real-time AWS SDK actions performed inside other sections of the dashboard.

---

## 🏪 The Autoinstall Software Marketplace Spotlight

The centerpiece of Floci Manager's orchestration engine is the brand-new **Autoinstall Software Marketplace**. It allows developers to deploy complex, scalable multi-tier web architectures onto the sandbox emulator automatically with a single click.

```
+--------------------------------------------------------------+
|                Autoinstall Marketplace Gate                  |
+--------------------------------------------------------------+
                                |
                  [ Select & Customize Stack ]
                        (e.g., Keycloak)
                                |
                     +----------+----------+
                     |                     |
             [ Dynamic IaC ]         [ Dev Optimizations ]
             - Terraform TF          - SSL TLS openSSL Generator
             - Nginx Conf            - Multistage Dockerfile
                     |                     |
                     +----------+----------+
                                |
                   [ Trigger Local Provision ]
           (Security Groups created & RDS Instance deployed)
                                |
               +----------------+----------------+
               |                                 |
      [ Live Stream Console ]          [ Keycloak Workspace Admin ]
      - Docker builder stages          - Real-time CPU & DB metrics
      - Nginx syntax verification      - Create Realms & Oauth Clients
```

### Keycloak SSO & Postgres RDS Pipeline Features:
* **True Multi-Stage Docker Builder**: Overcomes Keycloak's lack of native DB drivers by automatically compiling cache layers (`kc.sh build`) beforehand, preventing runtime database connection drops.
* **OpenSSL Cryptographic Scripts**: Generates custom self-signed authorities and packs certificates into PKCS12 (`.pfx`) formats for Java-native Keystore systems.
* **Nginx Reverse Proxy Automation**: Generates proxy parameters to seamlessly route traffic between local host interfaces, port mappings (e.g., `8080`, `8443`), and browser sessions.
* **Simulated & Real SDK Interfacing**: Instantly creates security groups via `@aws-sdk/client-ec2` and schedules DB allocations with `@aws-sdk/client-rds`.
* **Workspace Realm Management**: Once deployed, users can access an interactive admin portal to dynamically register Authentication Realms and assign secure OAuth clients.

---

## ⚙️ Tech Stack & Architecture

Floci Manager is built with high performance, beautiful interactions, and robust type safety at the forefront:

* **Framework**: React 19 + TypeScript (strict compilation rules).
* **Build System**: Vite 6 (configured for highly rapid feedback loops).
* **Styling**: Tailwind CSS v4 (designed with meticulous visual hierarchies and negative space).
* **Animation**: `motion` (staggered view transitions, responsive layout shifts, and visual micro-interactions).
* **Vector Icons**: `lucide-react` (comprehensive design-system iconography).
* **State Management**: React Context layers linking AWS client providers.

---

## 🚀 Getting Started

To spin up Floci Manager in development mode or compile its production-ready container builds within the cloud-run framework, utilize the following instructions:

### Prerequisites
Make sure you have Node.js (version 18 or higher) installed locally or inside your workspace.

### 1. Install Dependencies
```bash
npm install
```

### 2. Enter Environment Secret Variable
Create a local variable file if connecting directly to live cloud resources:
```bash
cp .env.example .env
```

### 3. Launch Development Server
```bash
npm run dev
```
*The application will boot and bind statically to `http://0.0.0.0:3000` behind the reverse-proxy. Ensure port `3000` is preserved for outer service entry.*

### 4. Build and Compile Production Files
Verify structural builds and TypeScript static checks before pushing updates:
```bash
npm run build
```

---

## 📂 Project Directory Map

```text
├── src/
│   ├── main.tsx         # App bootstrapping file
│   ├── App.tsx          # Main layout, routing engine, and view router
│   ├── index.css        # Core Tailwind imports and custom display typography
│   ├── types.ts         # Central typing registry for all AWS services
│   ├── components/      # Reusable visual UI elements, sidebars, and card frames
│   ├── contexts/        # Core AWS context controllers providing client managers
│   └── views/           # Meticulously structured views representing specialized AWS consoles
├── metadata.json        # Unified app info, frame bindings, and major permission declarations
├── package.json         # Complete dependencies register (fully bound web and AWS-SDK clients)
└── README.md            # The documentation file you are reading
```

---
*Created by the team at Floci.io. For issues, architectural recommendations, or further SDK additions, check out our Roadmap page inside the Application Console.*
