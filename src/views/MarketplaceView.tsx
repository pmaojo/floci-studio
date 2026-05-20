import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, 
  Search, 
  Settings as SettingsIcon, 
  Terminal, 
  Check, 
  Copy, 
  Layers, 
  Cpu, 
  Database, 
  Shield, 
  Lock, 
  Unlock, 
  HelpCircle, 
  Play, 
  Compass, 
  ArrowRight,
  Server,
  Globe,
  RefreshCw,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Users,
  Activity,
  Award,
  BookOpen
} from 'lucide-react';
import { useAws } from '../contexts/AwsContext';
import { CreateSecurityGroupCommand } from '@aws-sdk/client-ec2';
import { CreateDBInstanceCommand } from '@aws-sdk/client-rds';
import { PageHeader, Card, Button, Input, Skeleton, Select } from '../components/ui-elements';

interface MarketplaceItem {
  id: string;
  name: string;
  category: 'Identity' | 'Web Apps' | 'Observability' | 'Databases';
  description: string;
  icon: React.ReactNode;
  tags: string[];
  status: 'available' | 'coming_soon';
  author: string;
  rating: number;
}

const MarketplaceView = () => {
  const { clients, logActivity } = useAws();
  
  // Navigation states
  const [activeTab, setActiveTab] = useState<'catalog' | 'detail' | 'deployment' | 'management'>('catalog');
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Input States for Keycloak Deployment
  const [kcVersion, setKcVersion] = useState('22.0.5');
  const [instanceType, setInstanceType] = useState('t3a.medium');
  const [sgName, setSgName] = useState('keycloak-security-group');
  const [instanceName, setInstanceName] = useState('keycloak-web-host');
  const [dbName, setDbName] = useState('keycloak_database');
  const [dbPassword, setDbPassword] = useState('supersecretpass123');
  const [showPassword, setShowPassword] = useState(false);
  const [dbUser, setDbUser] = useState('keycloak_admin');
  const [dnsName, setDnsName] = useState('auth.sandbox-floci.dev');

  // Active Code Explorer Tab inside Detail View
  const [codeExplorerTab, setCodeExplorerTab] = useState<'terraform' | 'dockerfile' | 'nginx' | 'certs'>('terraform');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Deployment Logs state
  const [deployStep, setDeployStep] = useState(0);
  const [deployLogs, setDeployLogs] = useState<string[]>([]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentResult, setDeploymentResult] = useState<'success' | 'failed' | null>(null);

  // Completed deployment details
  const [liveIp, setLiveIp] = useState('18.197.88.221');
  const [liveDns, setLiveDns] = useState('ec2-18-197-88-221.eu-central-1.compute.amazonaws.com');
  const [liveRdsEndpoint, setLiveRdsEndpoint] = useState('keycloak-rds-postgres.cq87aj2.eu-central-1.rds.amazonaws.com:5432');

  // Management Active Utility States (realm creation simulator)
  const [realms, setRealms] = useState(['master', 'application-prod']);
  const [newRealmName, setNewRealmName] = useState('');
  const [oauthClients, setOauthClients] = useState([
    { name: 'account-console', type: 'openid-connect', status: 'Active' },
    { name: 'react-frontend-client', type: 'openid-connect', status: 'Active' },
    { name: 'node-api-backend', type: 'openid-connect', status: 'Configuration Pending' },
  ]);
  const [newClientName, setNewClientName] = useState('');

  // Static items list
  const marketplaceProducts: MarketplaceItem[] = [
    {
      id: 'keycloak',
      name: 'Keycloak SSO Server',
      category: 'Identity',
      description: 'Deploy an enterprise identity, user management and single sign-on (SSO) gateway. Integrates seamlessly with a dedicated Postgres RDS instance, EC2 host, custom optimized container settings, self-signed certificates, and an Nginx reverse-proxy front.',
      icon: <Lock className="text-amber-500" size={24} />,
      tags: ['SAML 2.0', 'OIDC', 'RDS Postgres', 'EC2', 'Docker', 'Nginx Proxy'],
      status: 'available',
      author: 'Yakuphan',
      rating: 4.9
    },
    {
      id: 'wordpress',
      name: 'WordPress HA Cluster',
      category: 'Web Apps',
      description: 'Highly-available WordPress CMS. Deploys an Application Load Balancer targeting an Auto Scaling Group, static content offloading to AWS S3, and RDS Aurora MySQL Database clusters.',
      icon: <Globe className="text-blue-500" size={24} />,
      tags: ['RDS MySQL', 'ALB', 'AutoScaling', 'S3 Shared Media', 'EFS'],
      status: 'coming_soon',
      author: 'Floci.io Core',
      rating: 4.7
    },
    {
      id: 'observability',
      name: 'Prometheus & Grafana Stack',
      category: 'Observability',
      description: 'Complete centralized monitoring sandbox. Launches Prometheus data gatherers, custom Node-Exporters on active EC2 nodes, and polished Grafana visualization boards initialized with beautiful system health pre-sets.',
      icon: <Activity className="text-pink-500" size={24} />,
      tags: ['Prometheus', 'Grafana', 'EC2 Node Exporter', 'Alertmanager'],
      status: 'coming_soon',
      author: 'DaemonOps',
      rating: 4.8
    },
    {
      id: 'nextcloud',
      name: 'Nextcloud Cloud Suite',
      category: 'Web Apps',
      description: 'Your own private cloud storage application. Spins up Nextcloud inside ECS Fargate web tasks, mounted directly to an AWS EFS filesystem and backed by Amazon S3 buckets for bulletproof objects hosting.',
      icon: <Database className="text-indigo-500" size={24} />,
      tags: ['ECS Fargate', 'EFS Storage', 'S3 Storage Backend', 'Redis'],
      status: 'coming_soon',
      author: 'PrivaCloud',
      rating: 4.6
    },
    {
      id: 'metabase',
      name: 'Metabase Analytics Engine',
      category: 'Databases',
      description: 'The simplest open-source analytics interface tool to trace database logs. Spins up beautiful interactive query interfaces connecting to existing AWS RDS, Redshift, or Athena data models.',
      icon: <Compass className="text-teal-500" size={24} />,
      tags: ['BI Analytics', 'RDS MySQL/Postgres', 'EC2 Container', 'Secure Tunnel'],
      status: 'coming_soon',
      author: 'DataOps Tools',
      rating: 4.5
    }
  ];

  // Code Generation Templates based on current UX configurations
  const generatedTerraform = `# ==========================================================
# Terraform Deploy: Keycloak + RDS Postgres on Dedicated EC2
# Generated by Floci Autoinstall Marketplace
# ==========================================================

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "5.21.0"
    }
  }
}

provider "aws" {
  region = "eu-central-1"
}

# Create a security group that allows inbound traffic on port 22, 8080 and 8443
resource "aws_security_group" "keycloak" {
  name        = "${sgName}"
  description = "Security Gateway allowing SSH, and Keycloak HTTPS bindings"

  ingress {
    description = "open ssh port for configuration"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "open Keycloak standard HTTP"
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "open Keycloak encrypted HTTPS"
    from_port   = 8443
    to_port     = 8443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${sgName}"
    AppTemplate = "Keycloak-Marketplace"
  }
}

# Create a optimized EC2 Node instance with Amazon Linux
resource "aws_instance" "keycloak" {
  ami                    = "ami-0e80cdc14ed2f397b" # Amazon Linux 2 AMI
  instance_type          = "${instanceType}"
  vpc_security_group_ids = [aws_security_group.keycloak.id]
  
  user_data = <<-EOF
              #!/bin/bash
              sudo yum update -y
              sudo amazon-linux-extras install docker -y
              sudo service docker start
              sudo usermod -aG docker ec2-user
              
              # Pull & setup postgresql toolkits to verify links
              sudo amazon-linux-extras enable postgresql13
              sudo yum install postgresql -y
              
              # Docker Compose installation
              sudo wget https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m) -O /usr/local/bin/docker-compose
              sudo chmod +x /usr/local/bin/docker-compose
              
              # Nginx proxy environment
              sudo yum install nginx -y
              sudo systemctl enable nginx
              sudo systemctl start nginx
              EOF

  tags = {
    Name = "${instanceName}"
  }
}

# Launch a scalable PostgreSQL RDS storage database
resource "aws_db_instance" "keycloak" {
  allocated_storage       = 20
  storage_type            = "gp2"
  engine                  = "postgres"
  engine_version          = "15.3"
  instance_class          = "db.t3.micro"
  db_name                 = "${dbName}"
  identifier              = "keycloak-rds"
  username                = "${dbUser}"
  password                = "${dbPassword}"
  multi_az                = false
  skip_final_snapshot     = true
  publicly_accessible     = true
}

resource "aws_security_group" "db_ingress" {
  name        = "postgresql_rds_sg"
  description = "Database Security Group for PostgreSQL"

  ingress {
    description     = "Allow port 5432 directly from EC2 workload instances"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.keycloak.id]
  }
}`;

  const generatedDockerfile = `# ==========================================================
# Optimized Dockerfile for Keycloak ${kcVersion} on PostgreSQL
# Generated by Floci Autoinstall Marketplace
# ==========================================================

FROM quay.io/keycloak/keycloak:${kcVersion} as builder

# Configure Postgres database engine vendor integration
ENV KC_DB=postgres

# Pre-bundle performance features for rapid application loads
ENV KC_FEATURES="account-api, account3, admin-api, admin-fine-grained-authz, admin2, authorization, declarative-user-profile, token-exchange, impersonation"

WORKDIR /opt/keycloak

# Build optimizations (enables fast schema compile on local execution)
RUN /opt/keycloak/bin/kc.sh build --cache=ispn --health-enabled=true --metrics-enabled=true

FROM quay.io/keycloak/keycloak:${kcVersion}

LABEL template.engine="floci"
LABEL keycloak.version="${kcVersion}"

# Copy compiled structures from builder step
COPY --from=builder /opt/keycloak/ /opt/keycloak/

# Resolve security algorithms issues regarding key validation over self-signed certs
USER root
RUN sed -i '/disabledAlgorithms/ s/ SHA1,//' /etc/crypto-policies/back-ends/java.config
USER keycloak

RUN /opt/keycloak/bin/kc.sh show-config

ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]`;

  const generatedNginx = `# ==========================================================
# Nginx Reverse Proxy - /etc/nginx/nginx.conf Configuration
# Routes external traffic to Docker container bindings
# ==========================================================

user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log;
pid /run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Redirect port 80 HTTP users to Keycloak HTTPS port securely
    server {
        listen 80;
        server_name ${dnsName} www.${dnsName};
        
        location / {
            # Route to Keycloak Local Host Docker mapping
            proxy_pass http://${liveIp}:8080;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }

    # Proxy secure HTTPS requests
    server {
        listen 443 ssl;
        server_name ${dnsName};

        ssl_certificate /etc/ssl/certs/keycloak-selfsigned.crt;
        ssl_certificate_key /etc/ssl/certs/keycloak-selfsigned.key;

        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        location / {
            # Redirect back onto protected Docker HTTPS socket
            proxy_pass https://${liveIp}:8443;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}`;

  const generatedCerts = `#!/bin/bash
# ==========================================================
# Self-Signed SSL Certificate Generator (for Nginx and Java Web Keystore)
# ==========================================================

echo "Creating secure certificates directories..."
mkdir -p ./keycloak/certs
cd ./keycloak/certs

# 1. Generate Private Authority Key and Certificate
openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \\
  -keyout keycloak-selfsigned.key \\
  -out keycloak-selfsigned.crt \\
  -subj "/C=US/ST=Sandbox/L=Floci/O=KeycloakDev/CN=${dnsName}"

# 2. Pack Private key and cert into PKCS12 (.pfx) format for Java Keystore engine
openssl pkcs12 -export \\
  -out latronic.pfx \\
  -inkey keycloak-selfsigned.key \\
  -in keycloak-selfsigned.crt \\
  -password pass:flocisecretheaven

echo "SUCCESS: SSL credentials packaged in latronic.pfx"`;

  const handleCopyCode = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Triggers the deployment of Keycloak (simulating complex actions and creating actual AWS items in Floci pod)
  const triggerAwsInstall = async () => {
    setIsDeploying(true);
    setDeployStep(0);
    setDeploymentResult(null);
    setDeployLogs([]);

    const logLine = (msg: string) => {
      setDeployLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    try {
      // Step 1: Initialize Terraform Provider configuration
      logLine("[TERRAFORM] Initializing infrastructure plugins...");
      logLine("[TERRAFORM] Searching for hashicorp/aws (v5.21) on Registry...");
      await new Promise(r => setTimeout(r, 1500));
      logLine("[TERRAFORM] Download complete. Initializing backend local state storage...");
      logLine("[TERRAFORM] Configuration directory validated successfully.");
      setDeployStep(1);

      // Step 2: Genuine AWS creation (Security Group)
      logLine("[AWS SDK] Initiating contact with EC2 daemon service...");
      try {
        await clients.ec2.send(new CreateSecurityGroupCommand({
          GroupName: sgName,
          Description: `Security group for ${instanceName} Keycloak host`
        }));
        logActivity('EC2', `CreateSecurityGroup: ${sgName}`, 'success', 'Created by Marketplace Installation');
        logLine(`[AWS SDK] Successfully created resource EC2:SecurityGroup [Name: ${sgName}]`);
      } catch (e: any) {
        logActivity('EC2', `CreateSecurityGroup failed: ${sgName}`, 'error', e.message);
        logLine(`[AWS SDK] (Warn) Security group ${sgName} might exist or connection skipped. Proceeding...`);
      }
      await new Promise(r => setTimeout(r, 1500));
      setDeployStep(2);

      // Step 3: RDS Postgres DB Instance setup
      logLine("[AWS SDK] Initiating contact with RDS daemon service...");
      logLine(`[AWS SDK] Provisioning RDS Cluster instance: postgres (version: 15.3, DB_NAME: ${dbName})`);
      try {
        await clients.rds.send(new CreateDBInstanceCommand({
          DBInstanceIdentifier: sgName + "-db",
          DBInstanceClass: "db.t3.micro",
          Engine: "postgres",
          MasterUsername: dbUser,
          MasterUserPassword: dbPassword,
          DBName: dbName,
          AllocatedStorage: 20
        }));
         logActivity('RDS', `CreateDBInstance: ${dbName}`, 'success', 'Created by Marketplace Installation');
         logLine(`[AWS SDK] Successfully triggered RDS:DBInstance allocation. status: CREATING [DB_NAME: ${dbName}]`);
      } catch (e: any) {
         logActivity('RDS', `CreateDBInstance failed: ${dbName}`, 'error', e.message);
         logLine(`[AWS SDK] (Warn) RDS provision response: ${e.message}`);
      }
      await new Promise(r => setTimeout(r, 1800));
      setDeployStep(3);

      // Step 4: Connecting onto EC2 Instance & creating Certs
      logLine(`[EC2 SSH] Connected to ${instanceName} instance...`);
      logLine("[EC2] Generating SSL cryptographic parameters using OpenSSL...");
      logLine(`[EC2] SSL Common Name (CN): ${dnsName}`);
      logLine("[EC2] Cert Authority key and latronic.pfx Java Keystore created successfully.");
      await new Promise(r => setTimeout(r, 1500));
      setDeployStep(4);

      // Step 5: Docker Build Optimization
      logLine("[DOCKER] Building custom optimization stage (Keycloak DB build)...");
      logLine(`[DOCKER] pulling base quay.io/keycloak/keycloak:${kcVersion}...`);
      logLine(`[DOCKER] RUNNING: /opt/keycloak/bin/kc.sh build --cache=ispn --health-enabled=true --metrics-enabled=true`);
      logLine("[DOCKER] [KC BUILD] Updating database vendor: postgres...");
      logLine("[DOCKER] [KC BUILD] Configuring application-api features...");
      logLine("[DOCKER] [KC BUILD] Optimizing internal schemas cache layers...");
      logLine("[DOCKER] Compiling optimized container layer completed successfully.");
      await new Promise(r => setTimeout(r, 2000));
      setDeployStep(5);

      // Step 6: Spawn Optimized Container Service
      logLine("[DOCKER] Launching optimized container container run execution...");
      logLine(`[DOCKER] ENV_VARS: KEYCLOAK_ADMIN=${dbUser} http-enabled=true db=postgres`);
      logLine(`[DOCKER] DB_CONNECTION: jdbc:postgresql://${liveRdsEndpoint}/${dbName}`);
      logLine("[DOCKER] Container running in background mode. ID: kc-prod-ee29ca1988b2");
      await new Promise(r => setTimeout(r, 1200));
      setDeployStep(6);

      // Step 7: Nginx Proxy Setup
      logLine("[NGINX] Writing default reverse proxy parameters inside /etc/nginx/nginx.conf...");
      logLine("[NGINX] Validating syntax: sudo nginx -t...");
      logLine("[NGINX] nginx: the configuration file /etc/nginx/nginx.conf syntax is ok");
      logLine("[NGINX] nginx: configuration file /etc/nginx/nginx.conf test is successful");
      logLine("[NGINX] Reloading server routing tables... sudo systemctl reload nginx");
      logLine("[NGINX] Gateway online! High availability routes active on ports 80 & 443.");
      await new Promise(r => setTimeout(r, 1500));

      setDeployStep(7);
      setDeploymentResult('success');
      logActivity('Marketplace', 'Deploy Keycloak SSO', 'success', 'All EC2 instance and RDS units active');
      
      // Delay to complete and open management dashboard
      setTimeout(() => {
        setActiveTab('management');
      }, 1500);

    } catch (err: any) {
      logLine(`[CRITICAL ERROR] Provisioning failed: ${err.message}`);
      setDeploymentResult('failed');
      logActivity('Marketplace', 'Deploy Keycloak SSO', 'error', err.message);
    } finally {
      setIsDeploying(false);
    }
  };

  const addRealm = () => {
    if (!newRealmName) return;
    const sanitizedName = newRealmName.toLowerCase().replace(/[^a-z0-9-_]/g, '');
    setRealms(prev => [...prev, sanitizedName]);
    logActivity('Keycloak API', `Create Realm: ${sanitizedName}`, 'success');
    setNewRealmName('');
  };

  const addClient = () => {
    if (!newClientName) return;
    setOauthClients(prev => [...prev, {
      name: newClientName,
      type: 'openid-connect',
      status: 'Active'
    }]);
    logActivity('Keycloak API', `Register Client: ${newClientName}`, 'success');
    setNewClientName('');
  };

  // Filter products list
  const filteredProducts = marketplaceProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || p.category.toLowerCase() === activeCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex flex-col h-full bg-brand-bg uppercase">
      <PageHeader
        title="Autoinstall Software Marketplace"
        icon={<ShoppingBag size={18} />}
        actions={
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant={activeTab === 'catalog' ? 'primary' : 'secondary'} 
              onClick={() => { setActiveTab('catalog'); setSelectedItem(null); }}
              icon={<Compass size={12} />}
            >
              BROWSE_MARKETPLACE
            </Button>
            {selectedItem && (
              <Button 
                size="sm" 
                variant={activeTab === 'detail' ? 'primary' : 'secondary'} 
                onClick={() => setActiveTab('detail')}
                icon={<SettingsIcon size={12} />}
              >
                PROPERTIES
              </Button>
            )}
            {selectedItem === 'keycloak' && deploymentResult === 'success' && (
              <Button 
                size="sm" 
                variant={activeTab === 'management' ? 'primary' : 'secondary'} 
                onClick={() => setActiveTab('management')}
                icon={<Activity size={12} />}
              >
                MANAGE_KEYCLOAK
              </Button>
            )}
          </div>
        }
      />

      <div className="flex-1 overflow-auto p-6 space-y-6">
        <AnimatePresence mode="wait">
          {/* CATALOG SECTION */}
          {activeTab === 'catalog' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="bg-brand-muted/40 border border-brand-text/10 p-4 rounded-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                  <h3 className="font-serif-italic text-sm font-bold text-brand-text">Instant Orchestrated Workloads</h3>
                  <p className="text-[9px] font-mono opacity-60 normal-case leading-relaxed max-w-xl">
                    Deploy multi-tier architectural pipelines instantly onto your emulator sandbox environment. Marketplace blueprints dynamically generate required AWS codes, self-signed secure sockets and proxy files.
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 p-2 text-emerald-800 text-[9px] font-mono">
                  <CheckCircle2 size={12} className="shrink-0 text-emerald-600 animate-pulse" />
                  <span>INTEGRATED WITH IAAS REPOSITORIES</span>
                </div>
              </div>

              {/* SEARCH & FILTER BAR */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text opacity-30" size={14} />
                  <Input 
                    placeholder="Search software products, integrations or labels..." 
                    className="pl-10 font-mono text-[11px]"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {['all', 'Identity', 'Web Apps', 'Observability', 'Databases'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat.toLowerCase())}
                      className={`px-3 py-1.5 text-[9px] font-bold border transition-colors ${
                        (cat === 'all' && activeCategory === 'all') || (activeCategory === cat.toLowerCase())
                          ? 'bg-brand-text border-brand-text text-brand-bg'
                          : 'border-brand-text/10 hover:border-brand-text text-brand-text bg-white'
                      }`}
                    >
                      {cat.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* CATALOG GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProducts.map((item) => (
                  <Card 
                    key={item.id} 
                    className={`flex flex-col justify-between hover:border-brand-text transition-all duration-300 relative ${
                      item.status === 'coming_soon' ? 'bg-white/60 opacity-80' : 'bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-4 border-b border-brand-text/5 pb-3">
                        <div className="p-3 border border-brand-text/10 bg-brand-muted/15">
                          {item.icon}
                        </div>
                        <div className="text-right">
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 border ${
                            item.status === 'coming_soon' 
                              ? 'border-neutral-300 bg-neutral-100 text-neutral-500' 
                              : 'border-amber-400 bg-amber-50 text-amber-800'
                          }`}>
                            {item.status === 'coming_soon' ? 'BUILD_ROADMAP' : 'DEPLOYABLE_NOW'}
                          </span>
                          <div className="flex items-center justify-end gap-1 mt-1 font-mono text-[9px] opacity-60">
                            ★ <span className="font-bold">{item.rating}</span>
                          </div>
                        </div>
                      </div>

                      <h3 className="font-bold text-xs mb-1 font-sans">{item.name}</h3>
                      <p className="text-[8px] font-mono text-zinc-400 mb-3 block">AUTHOR: {item.author.toUpperCase()}</p>
                      <p className="text-[10px] normal-case opacity-70 leading-relaxed min-h-20 mb-4">
                        {item.description}
                      </p>
                    </div>

                    <div className="space-y-4">
                      {/* Tags */}
                      <div className="flex flex-wrap gap-1.5">
                        {item.tags.map(t => (
                          <span key={t} className="text-[8px] font-mono px-1.5 py-0.5 border border-brand-text/5 bg-brand-muted/20 lowercase text-brand-text/80">
                            #{t}
                          </span>
                        ))}
                      </div>

                      {/* Launch Trigger */}
                      <div className="border-t border-brand-text/10 pt-4 flex gap-2">
                        {item.status === 'coming_soon' ? (
                          <div className="w-full text-center py-2 border border-dashed border-zinc-200 text-[9px] font-mono opacity-50 italic">
                            DEVELOPMENT_STG_IN_PROGRESS
                          </div>
                        ) : (
                          <Button 
                            className="w-full text-[10px]" 
                            icon={<ArrowRight size={12} />}
                            onClick={() => {
                              setSelectedItem(item.id);
                              setActiveTab('detail');
                            }}
                          >
                            SELECT_BLUEPRINT
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}

          {/* BLUEPRINT DETAIL SECTION (Properties and Configuration) */}
          {activeTab === 'detail' && selectedItem === 'keycloak' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 xl:grid-cols-3 gap-6"
            >
              {/* Left Form Parameter Panel */}
              <div className="xl:col-span-1 space-y-6">
                <Card className="bg-white border-2 border-brand-text p-6 space-y-6">
                  <div className="border-b border-brand-text/10 pb-3">
                    <span className="text-[8px] font-mono opacity-60 bg-amber-100 border border-amber-300 text-amber-800 px-1.5 py-0.5 font-bold rounded-xs">IDENTITY</span>
                    <h3 className="font-bold text-sm mt-2">{marketplaceProducts[0].name}</h3>
                    <p className="text-[9px] font-mono opacity-40 lowercase">{marketplaceProducts[0].tags.join(' | ')}</p>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold text-[9px] tracking-wider text-brand-text/50">PROVISION_PROPERTIES</h4>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold opacity-60">KEYCLOAK_ENGINE_VERSION</label>
                      <Select value={kcVersion} onChange={e => setKcVersion(e.target.value)}>
                        <option value="22.0.5">22.0.5 (Optimized build compatible)</option>
                        <option value="24.0.1">24.0.1 (Experimental Java17)</option>
                        <option value="21.1.2">21.1.2 (Legacy Quartz)</option>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold opacity-60">EC2_INSTANCE_PROFILE</label>
                      <Select value={instanceType} onChange={e => setInstanceType(e.target.value)}>
                        <option value="t3a.medium">t3a.medium (2 vCPU, 4GB RAM) - RECOMMENDED</option>
                        <option value="t2.micro">t2.micro (1 vCPU, 1GB RAM) - DEV ONLY</option>
                        <option value="m5.large">m5.large (2 vCPU, 8GB RAM) - PRODUCTION</option>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold opacity-60">EC2_HOST_TAG_NAME</label>
                      <Input value={instanceName} onChange={e => setInstanceName(e.target.value)} />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold opacity-60">SECURITY_GROUP_IDENTIFIER</label>
                      <Input value={sgName} onChange={e => setSgName(e.target.value)} />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold opacity-60">TARGET_DOMAIN_SERVER_NAME</label>
                      <Input value={dnsName} onChange={e => setDnsName(e.target.value)} />
                    </div>

                    <div className="pt-2 border-t border-brand-text/5 space-y-3">
                      <h5 className="font-bold text-[8px] text-zinc-400">RDS_POSTGRES_CREDENTIALS</h5>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold opacity-60">DATABASE_NAME</label>
                        <Input value={dbName} onChange={e => setDbName(e.target.value)} />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold opacity-60">MASTER_USER</label>
                        <Input value={dbUser} onChange={e => setDbUser(e.target.value)} />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold opacity-60">DATABASE_PASSWORD</label>
                        <div className="relative">
                          <Input 
                            type={showPassword ? 'text' : 'password'} 
                            value={dbPassword} 
                            onChange={e => setDbPassword(e.target.value)} 
                            className="font-mono text-xs pr-10"
                          />
                          <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold font-mono opacity-50 hover:opacity-100"
                          >
                            {showPassword ? 'HIDE' : 'SHOW'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-brand-text/10">
                    <Button 
                      className="w-full text-xs font-bold py-3 text-[11px]" 
                      variant="primary"
                      onClick={() => {
                        setActiveTab('deployment');
                        triggerAwsInstall();
                      }}
                      icon={<Play size={14} className="animate-pulse text-amber-400" />}
                    >
                      LAUNCH_KEYCLOAK_STACK_NOW
                    </Button>
                    <p className="text-[8px] normal-case opacity-50 mt-2 text-center">
                      Spins up actual AWS Security Groups & RDS items on Floci local infrastructure.
                    </p>
                  </div>
                </Card>
              </div>

              {/* Central Code and Architecture Explorer */}
              <div className="xl:col-span-2 space-y-6">
                <Card className="bg-white p-6 space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-brand-text/10 pb-4 gap-4">
                    <div>
                      <h3 className="font-bold text-xs tracking-widest flex items-center gap-2"><FileCode size={14} /> AUTOGENERATED_IaC_RESOURCES</h3>
                      <p className="text-[9px] text-zinc-500 normal-case">Code adapts dynamically based on custom sidebar properties configuration outputs</p>
                    </div>
                    {/* Source Tab controllers */}
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: 'terraform', label: 'Terraform (main.tf)' },
                        { id: 'dockerfile', label: 'Dockerfile' },
                        { id: 'nginx', label: 'Nginx Configuration' },
                        { id: 'certs', label: 'Cert Script' }
                      ].map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setCodeExplorerTab(t.id as any)}
                          className={`px-2.5 py-1.5 text-[8px] font-bold border transition-colors ${
                            codeExplorerTab === t.id 
                              ? 'bg-zinc-800 text-white border-zinc-800' 
                              : 'border-brand-text/10 hover:border-brand-text bg-white'
                          }`}
                        >
                          {t.label.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Code Screen Frame */}
                  <div className="relative">
                    <div className="absolute top-3 right-3 z-10">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="bg-zinc-100 border border-zinc-300 hover:bg-white h-7 py-1"
                        onClick={() => {
                          const currentText = codeExplorerTab === 'terraform' ? generatedTerraform 
                                            : codeExplorerTab === 'dockerfile' ? generatedDockerfile
                                            : codeExplorerTab === 'nginx' ? generatedNginx
                                            : generatedCerts;
                          handleCopyCode(currentText, codeExplorerTab);
                        }}
                        icon={copiedId === codeExplorerTab ? <Check size={11} className="text-emerald-700" /> : <Copy size={11} />}
                      >
                        {copiedId === codeExplorerTab ? 'COPIED' : 'COPY_CODE'}
                      </Button>
                    </div>

                    <div className="bg-zinc-950 text-zinc-300 font-mono text-[10px] p-4 pt-10 border border-brand-text rounded-sm h-120 overflow-auto normal-case scrollbar-hide">
                      <pre className="whitespace-pre-wrap select-all selection:bg-brand-muted/70">
                        {codeExplorerTab === 'terraform' && generatedTerraform}
                        {codeExplorerTab === 'dockerfile' && generatedDockerfile}
                        {codeExplorerTab === 'nginx' && generatedNginx}
                        {codeExplorerTab === 'certs' && generatedCerts}
                      </pre>
                    </div>
                  </div>

                  {/* Informational challenges & architecture banner details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-brand-text/5">
                    <div className="p-4 border border-brand-text/10 bg-brand-muted/15 space-y-2">
                      <h4 className="font-bold text-[9px] flex items-center gap-1.5"><HelpCircle size={12} /> THE DOCKER BUILD CHALLENGE</h4>
                      <p className="text-[10px] normal-case opacity-70 leading-relaxed">
                        Keycloak lacks direct out-of-the-box instructions for DB engines. In standard deployments, connecting Postgres fails unless <code className="bg-brand-muted p-0.5 font-bold font-mono">kc.sh build</code> compiles cache providers first. This template automates that via a custom Multi-Stage Dockerfile.
                      </p>
                    </div>

                    <div className="p-4 border border-rose-200 bg-rose-50/20 text-rose-900 space-y-2">
                      <h4 className="font-bold text-[9px] flex items-center gap-1.5 text-rose-800"><Shield size={12} /> SSL PROTOCOL POLICIES</h4>
                      <p className="text-[10px] normal-case opacity-70 leading-relaxed">
                        To resolve Keycloak 22 issues validating self-signed certificate structures over secure proxy websockets, we override default Java policies directly inside crypto backends via <code className="bg-rose-100 px-1 font-bold font-mono">sed</code> operations.
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </motion.div>
          )}

          {/* ACTIVE TERMINAL PROVISIONING MONITOR */}
          {activeTab === 'deployment' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-4xl mx-auto space-y-6"
            >
              <Card className="bg-white p-6 border-2 border-brand-text col-span-1 space-y-6">
                <div className="flex items-center justify-between border-b border-brand-text/10 pb-4">
                  <div>
                    <h3 className="font-bold text-xs">Deploying Keycloak Architecture Pipeline</h3>
                    <p className="text-[8px] opacity-50 font-mono">DEPLOYMENT_UUID: FLOCI-CD-9c29e1f</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isDeploying ? (
                      <span className="flex items-center gap-1 text-[9px] font-mono text-blue-700 animate-pulse font-bold">
                        <RefreshCw size={11} className="animate-spin" /> RUNNING_ACTIVE_IAAS_PLAN
                      </span>
                    ) : (
                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 border ${
                        deploymentResult === 'success' ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-rose-400 bg-rose-50 text-rose-800'
                      }`}>
                        {deploymentResult?.toUpperCase() || 'INACTIVE'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress steps UI */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                  {[
                    { step: 1, label: 'IaC INIT' },
                    { step: 2, label: 'SEC_GROUPS' },
                    { step: 3, label: 'RDS_POSTGRES' },
                    { step: 4, label: 'EC2_CERT_SSL' },
                    { step: 5, label: 'KC_DOCKER_BUILD' },
                    { step: 6, label: 'CONTAINER_RUN' },
                    { step: 7, label: 'NGINX_PROXY' }
                  ].map((s) => {
                    const isPassed = deployStep >= s.step;
                    const isActive = deployStep === s.step - 1 && isDeploying;
                    return (
                      <div 
                        key={s.step} 
                        className={`p-2 border text-center transition-all ${
                          isPassed 
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold' 
                            : isActive 
                            ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold animate-pulse' 
                            : 'border-brand-text/10 opacity-40 bg-white'
                        }`}
                      >
                        <span className="text-[10px] block font-mono">#{s.step}</span>
                        <span className="text-[8px] font-mono block whitespace-nowrap overflow-hidden text-ellipsis">{s.label}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Interactive live ANSI Terminal */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold flex items-center gap-1"><Terminal size={11} className="text-zinc-600" /> PROVISIONING_CONSOLE_LOG_STREAM</span>
                    <span className="text-[9px] font-mono opacity-50">SPEED: 115200 BAUD</span>
                  </div>
                  <div className="bg-zinc-950 text-emerald-400 font-mono text-[9px] p-4 border border-brand-text rounded-xs h-96 overflow-y-auto space-y-0.5 lowercase scrollbar-hide select-text">
                    {deployLogs.map((log, i) => (
                      <div key={i}>{log}</div>
                    ))}
                    {isDeploying && <div className="text-white animate-pulse">_ EXEC_STEP_PLANNER_ORCHESTRATING...</div>}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-brand-text/5">
                  <Button 
                    variant="ghost" 
                    onClick={() => {
                      setIsDeploying(false);
                      setActiveTab('catalog');
                    }}
                  >
                    ABORT_LAUNCH
                  </Button>
                  {deploymentResult === 'success' && (
                    <Button 
                      variant="primary" 
                      onClick={() => setActiveTab('management')}
                      icon={<CheckCircle2 size={12} />}
                    >
                      OPEN_MANAGEMENT_PORTAL
                    </Button>
                  )}
                </div>
              </Card>
            </motion.div>
          )}

          {/* COMPLETED KEYCLOAK WORKSPACE MANAGEMENT PANEL */}
          {activeTab === 'management' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="bg-brand-muted border border-brand-text p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 border border-brand-text bg-amber-50 rounded-sm">
                    <Lock size={20} className="text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs">KEYCLOAK_MANAGEMENT_SUITE (ACTIVE_RUNNING)</h3>
                    <p className="text-[10px] normal-case opacity-60">Connected to multi-tier deployment. SSL security online over reverse-proxy Nginx server bindings.</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-300 px-3 py-1.5 text-emerald-800 text-[9px] font-mono">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse mr-1"></div>
                  <span>SERVICE_STATUS: ONLINE</span>
                </div>
              </div>

              {/* Infrastructure Stats block */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="bg-white p-4 flex flex-col justify-between">
                  <div className="text-left font-mono">
                    <span className="text-[8px] text-zinc-400 block pb-1">EC2_HOST_IP</span>
                    <span className="text-xs font-bold font-mono normal-case select-all">{liveIp}</span>
                  </div>
                  <div className="text-[9px] font-mono opacity-50 pt-2 border-t border-brand-text/5 mt-4">
                    DNS: auth.sandbox-floci.dev
                  </div>
                </Card>

                <Card className="bg-white p-4 flex flex-col justify-between">
                  <div className="text-left font-mono">
                    <span className="text-[8px] text-zinc-400 block pb-1">RDS_POSTGRESql_HOST</span>
                    <span className="text-[10px] font-bold font-mono normal-case break-all select-all">{liveRdsEndpoint}</span>
                  </div>
                  <div className="text-[9px] font-mono opacity-50 pt-2 border-t border-brand-text/5 mt-4 flex justify-between">
                    <span>ENGINE: PG_15.3</span>
                    <span>SIZE: 20 GB GP2</span>
                  </div>
                </Card>

                <Card className="bg-white p-4">
                  <div className="flex items-center justify-between pb-1 border-b border-brand-text/5 mb-2">
                    <span className="text-[8px] font-mono text-zinc-400">EC2_CPU_METRIC</span>
                    <span className="text-[9px] font-mono font-bold text-blue-700 animate-pulse">LIVE</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Server size={18} className="text-zinc-400 shrink-0" />
                    <div className="flex-1">
                      <div className="h-2 bg-neutral-100 border border-brand-text/10">
                        <div className="h-full bg-blue-600" style={{ width: '28%' }} />
                      </div>
                      <span className="text-[9px] font-mono opacity-60 block mt-1">28% CPU LOAD (T3A.MEDIUM)</span>
                    </div>
                  </div>
                </Card>

                <Card className="bg-white p-4">
                  <div className="flex items-center justify-between pb-1 border-b border-brand-text/5 mb-2">
                    <span className="text-[8px] font-mono text-zinc-400">SSL_ENCRYPTION</span>
                    <span className="text-[9px] font-mono font-bold text-emerald-600">SECURE</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Shield size={18} className="text-emerald-600 shrink-0" />
                    <div>
                      <span className="text-[10px] font-bold block">X.509 ENCRYPTED</span>
                      <span className="text-[8px] font-mono opacity-60 block lowercase">CN=auth.sandbox-floci.dev (3650d)</span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Realms & Clients Active Manager Simulator Mock-Engine */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Realms Manager */}
                <Card className="bg-white p-6 space-y-4">
                  <div className="border-b border-brand-text/10 pb-3 flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-xs">KEYCLOAK_REALMS_DIRECTORY</h4>
                      <p className="text-[9px] normal-case text-zinc-500">Tenants containing independent silos of users, groups, and clients</p>
                    </div>
                    <span className="text-[9px] font-mono font-bold px-2 py-0.5 border border-brand-text bg-brand-muted/20">
                      COUNT: {realms.length}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input 
                        placeholder="new-organization-realm" 
                        value={newRealmName}
                        onChange={e => setNewRealmName(e.target.value)}
                        className="font-mono text-xs"
                      />
                      <Button size="sm" onClick={addRealm}>CREATE_REALM</Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      {realms.map((realm) => (
                        <div key={realm} className="p-3 border border-brand-text/10 bg-brand-muted/10 font-mono flex items-center justify-between">
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold block">{realm}</span>
                            <span className="text-[8px] text-zinc-400 flex items-center gap-1">
                              <Users size={10} /> {realm === 'master' ? '1 Admin' : '0 Users'}
                            </span>
                          </div>
                          {realm !== 'master' && (
                            <button 
                              className="text-[8px] font-bold text-rose-600 hover:underline shrink-0"
                              onClick={() => {
                                setRealms(prev => prev.filter(r => r !== realm));
                                logActivity('Keycloak API', `Delete Realm: ${realm}`, 'success');
                              }}
                            >
                              DELETE
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>

                {/* Clients / OAuth Registries */}
                <Card className="bg-white p-6 space-y-4">
                  <div className="border-b border-brand-text/10 pb-3 flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-xs">REGISTERED_OAUTH_CLIENTS</h4>
                      <p className="text-[9px] normal-case text-zinc-500">Trusted frontend apps with authorized redirect URI paths</p>
                    </div>
                    <span className="text-[9px] font-mono font-bold px-2 py-0.5 border border-brand-text bg-brand-muted/20">
                      COUNT: {oauthClients.length}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input 
                        placeholder="my-cool-frontend-app" 
                        value={newClientName}
                        onChange={e => setNewClientName(e.target.value)}
                        className="font-mono text-xs"
                      />
                      <Button size="sm" onClick={addClient}>ADD_CLIENT</Button>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-hide">
                      {oauthClients.map((c) => (
                        <div key={c.name} className="p-3 border border-brand-text/10 bg-white hover:bg-brand-muted/5 flex items-center justify-between text-[10px] font-mono">
                          <div className="space-y-0.5">
                            <span className="font-bold block text-brand-text">{c.name}</span>
                            <span className="text-[8px] opacity-60 block font-bold text-zinc-400">PROTOCOL: {c.type.toUpperCase()}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 border ${
                              c.status === 'Active' 
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-800' 
                                : 'border-amber-400 bg-amber-50 text-amber-800'
                            }`}>
                              {c.status.toUpperCase()}
                            </span>
                            <button 
                              className="text-[8px] text-zinc-400 hover:text-rose-600"
                              onClick={() => {
                                setOauthClients(prev => prev.filter(item => item.name !== c.name));
                                logActivity('Keycloak API', `Deregister Client: ${c.name}`, 'success');
                              }}
                            >
                              DEREGISTER
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              </div>

              {/* Informational helpful tips */}
              <Card className="bg-zinc-950 text-zinc-300 p-6 font-mono space-y-4 rounded-sm">
                <h4 className="text-xs text-white border-b border-zinc-800 pb-2 font-bold tracking-widest flex items-center gap-2"><BookOpen size={13} className="text-amber-500" /> INTEGRATING YOUR FIRST APPLICATION CLIENT</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-[10px] normal-case leading-relaxed">
                  <div className="space-y-1">
                    <span className="font-bold text-white block uppercase text-[9px] tracking-widest text-amber-500 font-mono">1. Register client ID</span>
                    <p className="normal-case opacity-70">Define a client (e.g., <code className="bg-zinc-900 border border-zinc-800 px-1 py-0.5 text-zinc-300">react-frontend-client</code>) with access type set to public, and enable standard flows.</p>
                  </div>
                  <div className="space-y-1">
                    <span className="font-bold text-white block uppercase text-[9px] tracking-widest text-amber-500 font-mono">2. Redirect URI configurations</span>
                    <p className="normal-case opacity-70">Register browser return redirect URLs in client settings to verify security (e.g. <code className="bg-zinc-900 border border-zinc-800 px-1 py-0.5 text-zinc-300">http://localhost:3000/*</code>).</p>
                  </div>
                  <div className="space-y-1">
                    <span className="font-bold text-white block uppercase text-[9px] tracking-widest text-amber-500 font-mono">3. Mount web adapter</span>
                    <p className="normal-case opacity-70">Initialize the keycloak-js SDK with target URL endpoint: <code className="bg-zinc-900 border border-zinc-800 px-1 py-0.5 text-zinc-300">authServerUrl: "https://auth.sandbox-floci.dev/auth"</code>.</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MarketplaceView;
