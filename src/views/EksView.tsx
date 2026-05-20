import React, { useState, useEffect } from 'react';
import { Terminal, Cpu, HardDrive, Trash2, CirclePlus, RefreshCw, Zap, Layers, ServerCrash, Sliders, Globe, ShieldAlert, CheckCircle2, ListFilter, Activity } from 'lucide-react';
import { PageHeader, Card, Button, Input, Modal, Select } from '../components/ui-elements';
import { useAws } from '../contexts/AwsContext';

interface EksCluster {
  id: string;
  name: string;
  version: string;
  status: 'active' | 'creating';
  endpoint: string;
  createdTime: string;
}

interface EksPod {
  id: string;
  name: string;
  namespace: string;
  deployment: string;
  status: 'Running' | 'Pending' | 'Terminating' | 'ContainerCreating';
  restarts: number;
  cpu: number; // millicores
  memory: number; // MiB
  age: string;
  nodeType: 'NODE_GROUP' | 'FARGATE';
}

interface FargateProfile {
  id: string;
  name: string;
  namespace: string;
  subnets: string;
  status: 'ACTIVE' | 'CREATING';
}

const EksView = () => {
  const { logActivity } = useAws();
  
  // Storage for clusters & pods
  const [clusters, setClusters] = useState<EksCluster[]>(() => {
    const saved = localStorage.getItem('floci-aws-sim-eks-clusters');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      {
        id: 'cluster-prod-1',
        name: 'kubernetes-prod-cluster',
        version: '1.29',
        status: 'active',
        endpoint: 'https://F9AEEC28912A098E0198.yl4.us-east-1.eks.amazonaws.com',
        createdTime: new Date(Date.now() - 86400000 * 30).toISOString()
      }
    ];
  });

  const [pods, setPods] = useState<EksPod[]>(() => {
    const saved = localStorage.getItem('floci-aws-sim-eks-pods');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      { id: 'pod-1', name: 'nginx-ingress-controller-6f5df77df8-abc12', namespace: 'ingress-nginx', deployment: 'nginx-ingress-controller', status: 'Running', restarts: 0, cpu: 12, memory: 94, age: '14d', nodeType: 'NODE_GROUP' },
      { id: 'pod-2', name: 'billing-api-74fd994f78-qwer1', namespace: 'default', deployment: 'billing-api', status: 'Running', restarts: 2, cpu: 45, memory: 184, age: '3d', nodeType: 'FARGATE' },
      { id: 'pod-3', name: 'billing-api-74fd994f78-zxcv8', namespace: 'default', deployment: 'billing-api', status: 'Running', restarts: 1, cpu: 38, memory: 172, age: '3d', nodeType: 'FARGATE' },
      { id: 'pod-4', name: 'redis-cache-leader-0', namespace: 'default', deployment: 'redis-cache-leader', status: 'Running', restarts: 0, cpu: 8, memory: 48, age: '8d', nodeType: 'NODE_GROUP' },
      { id: 'pod-5', name: 'coredns-7c6dffc4c9-xyz99', namespace: 'kube-system', deployment: 'coredns', status: 'Running', restarts: 0, cpu: 4, memory: 28, age: '30d', nodeType: 'FARGATE' },
    ];
  });

  // Fargate Profiles lists
  const [fargateProfiles, setFargateProfiles] = useState<FargateProfile[]>(() => {
    const saved = localStorage.getItem('floci-aws-sim-eks-fargate-profiles');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      { id: 'prof-1', name: 'fargate-default-profile', namespace: 'default', subnets: 'subnet-09f1828f,subnet-081e92c2', status: 'ACTIVE' },
      { id: 'prof-2', name: 'fargate-core-services', namespace: 'kube-system', subnets: 'subnet-09f1828f', status: 'ACTIVE' }
    ];
  });

  const [fargateLogs, setFargateLogs] = useState<{ id: string; timestamp: string; level: 'INFO' | 'SUCCESS' | 'WARN'; message: string }[]>(() => [
    { id: 'log-1', timestamp: new Date(Date.now() - 30000).toISOString(), level: 'INFO', message: 'Fargate profile controller loaded matching namespace: default' },
    { id: 'log-2', timestamp: new Date(Date.now() - 10000).toISOString(), level: 'SUCCESS', message: 'Hypervisor sandbox allocation stabilized for pod replication deployment group' }
  ]);

  useEffect(() => {
    localStorage.setItem('floci-aws-sim-eks-clusters', JSON.stringify(clusters));
  }, [clusters]);

  useEffect(() => {
    localStorage.setItem('floci-aws-sim-eks-pods', JSON.stringify(pods));
  }, [pods]);

  useEffect(() => {
    localStorage.setItem('floci-aws-sim-eks-fargate-profiles', JSON.stringify(fargateProfiles));
  }, [fargateProfiles]);

  // Continuously oscillate CPU/Memory metrics
  useEffect(() => {
    const interval = setInterval(() => {
      setPods(currentPods => 
        currentPods.map(p => {
          if (p.status !== 'Running') return p;
          const cpuOffset = Math.floor((Math.random() - 0.5) * 6);
          const memOffset = Math.floor((Math.random() - 0.5) * 8);
          return {
            ...p,
            cpu: Math.max(1, p.cpu + cpuOffset),
            memory: Math.max(10, p.memory + memOffset)
          };
        })
      );
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clusterName, setClusterName] = useState('');
  const [k8sVersion, setK8sVersion] = useState('1.29');

  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [deployName, setDeployName] = useState('');
  const [namespace, setNamespace] = useState('default');
  const [replicas, setReplicas] = useState('2');

  const [isFargateModalOpen, setIsFargateModalOpen] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [targetNamespace, setTargetNamespace] = useState('default');

  const addFargateLog = (level: 'INFO' | 'SUCCESS' | 'WARN', message: string) => {
    const newLogItem = {
      id: `fargatetimer-${Math.random().toString(36).substring(4)}`,
      timestamp: new Date().toISOString(),
      level,
      message
    };
    setFargateLogs(prev => [newLogItem, ...prev]);
  };

  const fetchClusters = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      logActivity('EKS', 'ListClusters', 'success', 'Kubernetes Cluster Discovery Completed');
    }, 400);
  };

  const handleCreateCluster = () => {
    if (!clusterName) return;
    const cleanName = clusterName.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    const randId = Math.random().toString(36).substring(2, 20).toUpperCase();
    const endpointSim = `https://${randId}.yl4.us-east-1.eks.amazonaws.com`;

    const newCluster: EksCluster = {
      id: `cluster-${Math.random().toString(36).substring(5)}`,
      name: cleanName,
      version: k8sVersion,
      status: 'creating',
      endpoint: endpointSim,
      createdTime: new Date().toISOString()
    };

    setClusters(prev => [...prev, newCluster]);
    logActivity('EKS', `CreateCluster: ${cleanName}`, 'success', `K8s: v${k8sVersion}`);

    setTimeout(() => {
      setClusters(current => 
        current.map(c => c.id === newCluster.id ? { ...c, status: 'active' } : c)
      );
      logActivity('EKS', `ClusterActive: ${cleanName}`, 'success', 'Control plane provisioning completed');
    }, 5000);

    setIsModalOpen(false);
    setClusterName('');
  };

  const handleDeleteCluster = (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete EKS Cluster "${name}"?`)) return;
    setClusters(prev => prev.filter(c => c.id !== id));
    logActivity('EKS', `DeleteCluster: ${name}`, 'success', 'Terminating k8s nodes & cluster control plane');
  };

  const handleCreateFargateProfile = () => {
    if (!newProfileName) return;
    const formattedName = newProfileName.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    
    const newProf: FargateProfile = {
      id: `prof-${Math.random().toString(36).substring(5)}`,
      name: formattedName,
      namespace: targetNamespace,
      subnets: 'subnet-09f1828f,subnet-081e92c2',
      status: 'CREATING'
    };

    setFargateProfiles(prev => [...prev, newProf]);
    logActivity('EKS', `CreateFargateProfile: ${formattedName}`, 'success', `Matches target Namespace: ${targetNamespace}`);
    addFargateLog('INFO', `Initializing Fargate profile agent controller: ${formattedName}`);

    setTimeout(() => {
      setFargateProfiles(current => 
        current.map(p => p.id === newProf.id ? { ...p, status: 'ACTIVE' } : p)
      );
      addFargateLog('SUCCESS', `Fargate profile [${formattedName}] active. Hooked namespace schedulers.`);
      logActivity('EKS', `FargateProfileActive: ${formattedName}`, 'success');
    }, 4000);

    setIsFargateModalOpen(false);
    setNewProfileName('');
  };

  const handleDeleteFargateProfile = (id: string, name: string) => {
    if (!confirm(`Delete Fargate Profile "${name}"?`)) return;
    setFargateProfiles(prev => prev.filter(p => p.id !== id));
    logActivity('EKS', `DeleteFargateProfile: ${name}`, 'success');
    addFargateLog('WARN', `Destroyed Fargate profile [${name}]. Routed namespaces reverted to legacy worker node groups.`);
  };

  // Deploy Kubernetes Workloads
  const handleDeployTarget = () => {
    if (!deployName) return;
    const cleanDeploy = deployName.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    const repCount = Math.min(10, Math.max(1, parseInt(replicas) || 1));

    // Check if namespace matches any active Fargate Profile namespace matchers!
    const matchesFargate = fargateProfiles.some(p => p.namespace === namespace && p.status === 'ACTIVE');
    const assignedNodeType = matchesFargate ? 'FARGATE' : 'NODE_GROUP';

    logActivity('EKS', `CreateDeployment: ${cleanDeploy}`, 'success', `Namespace: ${namespace}, Replicas: ${repCount}, Node allocation: ${assignedNodeType}`);

    if (matchesFargate) {
      addFargateLog('INFO', `Matched Fargate scheduler targets for deployment [${cleanDeploy}] namespace [${namespace}]`);
      addFargateLog('INFO', `Requesting serverless microVM sandboxes for ${repCount} container replicas...`);
    }

    const newPodsList: EksPod[] = [];
    for (let i = 0; i < repCount; i++) {
      const uniqueSuffix = Math.random().toString(36).substring(2, 7);
      const podName = `${cleanDeploy}-${Math.random().toString(36).substring(2, 7)}-${uniqueSuffix}`;
      
      const newPod: EksPod = {
        id: `pod-custom-${Math.random().toString(36).substring(4)}`,
        name: podName,
        namespace,
        deployment: cleanDeploy,
        status: 'ContainerCreating',
        restarts: 0,
        cpu: 0,
        memory: 15,
        age: '1s',
        nodeType: assignedNodeType
      };
      newPodsList.push(newPod);
    }

    setPods(prev => [...newPodsList, ...prev]);
    setIsDeployModalOpen(false);
    setDeployName('');

    // Simulated scheduling stages
    newPodsList.forEach((singlePod, idx) => {
      setTimeout(() => {
        setPods(curr => curr.map(p => p.id === singlePod.id ? { ...p, status: 'Pending', cpu: 1 } : p));
        if (matchesFargate && idx === 0) {
          addFargateLog('INFO', `Registered scheduler binding with host routing agent. Allocating virtual resources...`);
        }
      }, 1500);

      setTimeout(() => {
        setPods(curr => curr.map(p => p.id === singlePod.id ? { 
          ...p, 
          status: 'Running', 
          cpu: Math.floor(Math.random() * 20 + 5), 
          memory: Math.floor(Math.random() * 50 + 60),
          age: '1m'
        } : p));
        logActivity('EKS', `PodRunning: ${singlePod.name}`, 'success');
        if (matchesFargate && idx === 0) {
          addFargateLog('SUCCESS', `Successfully scheduled microVM node for pod container replicas [${cleanDeploy}]`);
        }
      }, 4000);
    });
  };

  // Self-Healing
  const handleTerminatePod = (podId: string, podName: string, deploymentName: string, ns: string, originalNodeType: 'NODE_GROUP' | 'FARGATE') => {
    logActivity('EKS', `DeletePod: ${podName}`, 'success', `Replica set scheduling reconciliation for ${deploymentName}`);
    
    if (originalNodeType === 'FARGATE') {
      addFargateLog('WARN', `Container pod crashed: [${podName}]. Initiating rapid fargate self-healing scheduler...`);
    }

    setPods(curr => curr.map(p => p.id === podId ? { ...p, status: 'Terminating', cpu: 0, memory: 0 } : p));

    setTimeout(() => {
      setPods(curr => curr.filter(p => p.id !== podId));
    }, 1500);

    const replacementId = `pod-replacement-${Math.random().toString(36).substring(4)}`;
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    const replacementName = `${deploymentName}-${Math.random().toString(36).substring(2, 7)}-${randomSuffix}`;

    const newPod: EksPod = {
      id: replacementId,
      name: replacementName,
      namespace: ns,
      deployment: deploymentName,
      status: 'Pending',
      restarts: 0,
      cpu: 0,
      memory: 10,
      age: '1s',
      nodeType: originalNodeType
    };

    setTimeout(() => {
      setPods(curr => [newPod, ...curr]);
      logActivity('EKS', `ScheduleReplacementPod: ${replacementName}`, 'success', `Self-healing for ReplicaSet ${deploymentName}`);
      if (originalNodeType === 'FARGATE') {
        addFargateLog('INFO', `Allocated replacement microVM sandbox node for self healed pod: [${replacementName}]`);
      }
    }, 2000);

    setTimeout(() => {
      setPods(curr => curr.map(p => p.id === replacementId ? { 
        ...p, 
        status: 'Running',
        cpu: Math.floor(Math.random() * 30 + 10),
        memory: Math.floor(Math.random() * 80 + 70),
        age: '1m'
      } : p));
      logActivity('EKS', `ReplacementPodOnline: ${replacementName}`, 'success', `Stable self-healing completion`);
    }, 4500);
  };

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader
        title="EKS Cluster Controller & Fargate Scheduling"
        icon={<Terminal size={18} />}
        onRefresh={fetchClusters}
        isRefreshing={loading}
        actions={
          <div className="flex gap-2">
            <Button onClick={() => setIsFargateModalOpen(true)} variant="secondary" icon={<CirclePlus size={14} />}>
              Configure Fargate Profile
            </Button>
            <Button onClick={() => setIsDeployModalOpen(true)} variant="secondary" icon={<CirclePlus size={14} />}>
              Create Deployment
            </Button>
            <Button onClick={() => setIsModalOpen(true)} icon={<CirclePlus size={14} />}>
              Add EKS Cluster
            </Button>
          </div>
        }
      />

      {/* Cluster creation modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Provision EKS Cluster (Control Plane)">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60 font-sans">Cluster Name (Identifier)</label>
            <Input
              value={clusterName}
              onChange={e => setClusterName(e.target.value)}
              placeholder="eks-billing-services"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60 font-sans">Kubernetes Engine Version</label>
            <Select value={k8sVersion} onChange={e => setK8sVersion(e.target.value)}>
              <option value="1.29">v1.29 (Native Horizontal Rollout)</option>
              <option value="1.28">v1.28</option>
              <option value="1.27">v1.27</option>
            </Select>
          </div>
          <div className="pt-4 flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleCreateCluster} disabled={!clusterName}>
              Provision Cluster
            </Button>
          </div>
        </div>
      </Modal>

      {/* Fargate Profile Creation Modal */}
      <Modal isOpen={isFargateModalOpen} onClose={() => setIsFargateModalOpen(false)} title="Configure EKS Fargate Compliance Profile">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60 font-sans">Profile Identifier</label>
            <Input
              value={newProfileName}
              onChange={e => setNewProfileName(e.target.value)}
              placeholder="fargate-microservices"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60 font-sans">Kubernetes Namespace Matcher</label>
            <Select value={targetNamespace} onChange={e => setTargetNamespace(e.target.value)}>
              <option value="default font-sans">Default Namespace</option>
              <option value="kube-system font-sans">Kube-System Core</option>
              <option value="ingress-nginx font-sans">Ingress Controls</option>
            </Select>
          </div>
          <div className="p-3 bg-indigo-50 border border-indigo-200 text-indigo-900 text-[9.5px] font-mono lowercase">
            <p><strong>Fargate compliance note:</strong> Any pods created matching the matched namespace will bypass EC2 node groups, serverlessly scheduling directly inside AWS Hypervisor microVM sandbox nodes.</p>
          </div>
          <div className="pt-2 flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setIsFargateModalOpen(false)}>Cancel</Button>
            <Button className="flex-1 bg-indigo-950 text-indigo-50" onClick={handleCreateFargateProfile} disabled={!newProfileName}>
              Provision Profile
            </Button>
          </div>
        </div>
      </Modal>

      {/* Workload Deployment Modal */}
      <Modal isOpen={isDeployModalOpen} onClose={() => setIsDeployModalOpen(false)} title="Deploy Kubernetes Workload">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60 font-sans">Deployment / Application Name</label>
            <Input
              value={deployName}
              onChange={e => setDeployName(e.target.value)}
              placeholder="payment-gateway"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60 text-indigo-700 font-sans">Kubernetes Namespace Target</label>
            <Select value={namespace} onChange={e => setNamespace(e.target.value)}>
              <option value="default">Default Namespace</option>
              <option value="kube-system">Kube-System Core</option>
              <option value="ingress-nginx">Ingress Controls</option>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60 font-sans">Replicas Scheduling Count</label>
            <Input
              type="number"
              value={replicas}
              onChange={e => setReplicas(e.target.value)}
              placeholder="2"
            />
          </div>
          <div className="pt-4 flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setIsDeployModalOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleDeployTarget} disabled={!deployName}>
              Create Pod replicas
            </Button>
          </div>
        </div>
      </Modal>

      <div className="p-6 space-y-6 flex-1 overflow-auto bg-brand-bg">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* EKS Control Plane Panel */}
          <div className="xl:col-span-1 space-y-6">
            <div className="border border-brand-text/15 bg-white p-4 rounded-sm">
              <h3 className="font-bold text-xs pb-3 border-b border-brand-text/10 mb-4 tracking-wider flex items-center gap-2">
                <Layers size={13} /> CONTROL_PLANE_CLUSTERS
              </h3>
              <div className="space-y-4">
                {clusters.map(cluster => (
                  <div key={cluster.id} className="border border-brand-text/5 bg-brand-muted/10 p-3 hover:border-brand-text/50 rounded-sm relative">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-mono font-bold text-[10px] truncate max-w-[170px]">{cluster.name}</span>
                      <button onClick={() => handleDeleteCluster(cluster.id, cluster.name)} className="p-0.5 text-zinc-400 hover:text-rose-600">
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <p className="text-[9px] font-mono text-indigo-700 font-bold mb-3 uppercase">Engine: Kubernetes v{cluster.version}</p>
                    <p className="text-[8px] font-mono opacity-50 select-all lowercase truncate mb-3 font-sans">Endpoint: {cluster.endpoint}</p>

                    <div className="flex justify-between items-center pt-2 border-t border-brand-text/5 text-[9px]">
                      <span className="opacity-40">Status:</span>
                      <div className="flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${cluster.status === 'active' ? 'bg-emerald-500' : 'bg-amber-400 animate-ping'}`} />
                        <span className="font-mono font-bold uppercase">{cluster.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* EKS FARGATE PROFILES CONTROLLER MANAGER */}
            <div className="border border-brand-text/15 bg-white p-4 rounded-sm">
              <h3 className="font-bold text-xs pb-3 border-b border-brand-text/10 mb-4 tracking-wider flex items-center gap-2">
                <Sliders size={13} className="text-indigo-600" />
                GLACIER_FARGATE_PROFILE_POOL
              </h3>
              <div className="space-y-3 font-mono text-[9px]">
                {fargateProfiles.map((prof) => (
                  <div key={prof.id} className="border border-indigo-100 p-2.5 bg-indigo-50/15 hover:border-indigo-300 rounded-sm">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-indigo-950 font-mono text-[10px]">{prof.name}</span>
                      <button onClick={() => handleDeleteFargateProfile(prof.id, prof.name)} className="text-zinc-400 hover:text-rose-600">
                        <Trash2 size={11} />
                      </button>
                    </div>
                    <div className="flex justify-between items-center text-[8.5px] opacity-70 mb-2 uppercase">
                      <span>Namespace matcher: <strong className="text-indigo-700">{prof.namespace}</strong></span>
                      <span className={prof.status === 'ACTIVE' ? 'text-emerald-600 font-bold' : 'text-amber-500 font-bold animate-pulse'}>{prof.status}</span>
                    </div>
                    <p className="text-[7.5px] opacity-40 select-all lowercase">Subnets: {prof.subnets}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Kubernetes statistics stability Indicators */}
            <div className="border border-brand-text/15 bg-white p-4 rounded-sm">
              <h3 className="font-bold text-xs pb-3 border-b border-brand-text/10 mb-2 tracking-wider">KUBE_KPI_SCHEDULING</h3>
              <div className="space-y-3 pt-2 text-[10px] font-mono">
                <div className="flex justify-between">
                  <span className="opacity-60">Total Running Pods:</span>
                  <span className="font-bold text-brand-text">{pods.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-60">Routed to Fargate node:</span>
                  <span className="font-bold text-indigo-700 font-mono">{pods.filter(p => p.nodeType === 'FARGATE').length} Pods</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-60">Allocated EC2 Workers:</span>
                  <span className="font-bold text-zinc-700 font-mono">{pods.filter(p => p.nodeType === 'NODE_GROUP').length} Pods</span>
                </div>
              </div>
            </div>
          </div>

          {/* Active pods & Fargate dynamic log logs streams */}
          <div className="xl:col-span-2 space-y-6">
            {/* Live Pod inventory list */}
            <div className="border border-brand-text/15 bg-white p-4 rounded-sm">
              <div className="flex justify-between items-center pb-3 border-b border-brand-text/10 mb-4">
                <h3 className="font-bold text-xs tracking-wider flex items-center gap-2">
                  <Cpu size={13} className="animate-spin text-zinc-500" style={{ animationDuration: '6s' }} />
                  KUBE_POD_SCHEDULER_INVENTORY
                </h3>
                <span className="text-[8px] font-mono opacity-40">DAEMON_STABLE_HEALING</span>
              </div>

              <div className="space-y-2 max-h-[350px] overflow-auto pr-1">
                {pods.map(pod => (
                  <div key={pod.id} className="border border-brand-text/5 hover:border-brand-text/30 bg-brand-muted/15 p-2 flex justify-between items-center font-mono text-[10px]">
                    <div className="flex items-center gap-3">
                      <div className="text-left">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${
                            pod.status === 'Running' ? 'bg-emerald-500' :
                            pod.status === 'Terminating' ? 'bg-rose-500 animate-pulse' : 'bg-amber-400'
                          }`} />
                          <span className="font-bold text-brand-text text-[11px] font-mono lowercase">{pod.name}</span>
                        </div>
                        <div className="flex flex-wrap gap-2.5 text-[8px] text-zinc-400 mt-1 uppercase items-center font-sans">
                          <span>Namespace: <strong className="text-indigo-600 font-mono">{pod.namespace}</strong></span>
                          <span>Deployment: <strong className="font-mono">{pod.deployment}</strong></span>
                          <span>Allocation Host: <strong className={`font-mono ${pod.nodeType === 'FARGATE' ? 'text-indigo-800 bg-indigo-50 border border-indigo-200 px-1 py-0.2 rounded font-extrabold' : 'text-zinc-600'}`}>{pod.nodeType}</strong></span>
                          <span>Restarts: <strong>{pod.restarts}</strong></span>
                          <span>Age: <strong>{pod.age}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 shrink-0 text-right">
                      {pod.status === 'Running' && (
                        <div className="hidden sm:flex items-center gap-4 text-[9px] text-neutral-500 font-mono">
                          <span className="flex items-center gap-1"><Cpu size={10} /> {pod.cpu}m</span>
                          <span className="flex items-center gap-1"><HardDrive size={10} /> {pod.memory}Mi</span>
                        </div>
                      )}
                      <div className="w-16">
                        <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-sm uppercase font-sans ${
                          pod.status === 'Running' ? 'bg-emerald-100 text-emerald-800' :
                          pod.status === 'Terminating' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {pod.status}
                        </span>
                      </div>
                      <button 
                        onClick={() => handleTerminatePod(pod.id, pod.name, pod.deployment, pod.namespace, pod.nodeType)}
                        disabled={pod.status === 'Terminating'}
                        className="p-1.5 border border-transparent text-zinc-400 hover:text-rose-600 hover:border-rose-200 transition-all rounded disabled:opacity-25"
                        title="Kill and recreate Pod instantly (Test Self Healing)"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Fargate MicroVM Scheduling Log Stream console */}
            <div className="border border-brand-text/15 bg-white p-4 rounded-sm">
              <h3 className="font-bold text-xs pb-3 border-b border-brand-text/10 mb-4 tracking-wider flex items-center gap-1.5">
                <Activity size={12} className="text-indigo-600 animate-pulse" />
                FARGATE_SERVERLESS_SCHEDULER_DAEMON_LOG
              </h3>
              <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-sm text-neutral-300 font-mono text-[9px] space-y-2.5 max-h-[220px] overflow-auto">
                {fargateLogs.map(log => (
                  <div key={log.id} className="pb-2 border-b border-neutral-800/20 last:border-b-0 lowercase leading-relaxed flex items-start gap-2">
                    <span className="text-[7.5px] opacity-40 font-sans mt-0.5">{new Date(log.timestamp).toLocaleTimeString()}:</span>
                    <span className={`font-bold font-sans uppercase shrink-0 text-[8px] px-1 rounded ${
                      log.level === 'SUCCESS' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                      log.level === 'WARN' ? 'bg-red-950 text-red-300 border border-red-800' : 'bg-neutral-800 text-neutral-400'
                    }`}>
                      [{log.level}]
                    </span>
                    <span className="text-neutral-400 font-mono break-all">{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EksView;
