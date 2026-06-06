import { useState, useEffect, useCallback } from 'react';
import {
  ListProjectsCommand,
  BatchGetProjectsCommand,
  ListBuildsForProjectCommand,
  BatchGetBuildsCommand,
  StartBuildCommand
} from '@aws-sdk/client-codebuild';
import { useAws } from '../contexts/AwsContext';
import { 
  Hammer, 
  Search, 
  Clock, 
  Play, 
  Cpu, 
  Github, 
  Terminal, 
  FileText, 
  Plus, 
  Activity, 
  Settings, 
  ChevronRight, 
  AlertTriangle 
} from 'lucide-react';
import { PageHeader, Card, Button, Input, Skeleton } from '../components/ui-elements';

// Local view models — CodeBuild responses are flattened/augmented for display
// (ISO-string timestamps, per-build duration), so these don't map 1:1 to the SDK types.
interface CbEnvVar {
  name: string;
  value: string;
  type: 'PLAINTEXT' | 'PARAMETER_STORE' | 'SECRETS_MANAGER';
}

interface CbEnvironment {
  type: string;
  image: string;
  computeType: string;
  environmentVariables?: CbEnvVar[];
}

interface CbSource {
  type: string;
  location: string;
}

interface CbProject {
  name: string;
  description?: string;
  environment?: CbEnvironment;
  source?: CbSource;
  serviceRole?: string;
  created?: string;
}

interface CbBuildPhase {
  phaseType: string;
  phaseStatus?: string;
  durationInSeconds?: number;
}

interface CbBuild {
  id: string;
  projectName?: string;
  buildStatus: string;
  startTime: string;
  endTime?: string;
  durationInSeconds?: number;
  sourceVersion?: string;
  phases?: CbBuildPhase[];
}

// Preloaded mock projects in case local emulator contains none
const PRELOADED_PROJECTS: CbProject[] = [
  {
    name: 'floci-auth-service-builder',
    description: 'Auto-bundling task for Floci Gateway Authorization services',
    environment: {
      type: 'LINUX_CONTAINER',
      image: 'aws/codebuild/amazonlinux2-x86_64-standard:4.0',
      computeType: 'BUILD_GENERAL1_SMALL',
      environmentVariables: [
        { name: 'NODE_ENV', value: 'production', type: 'PLAINTEXT' },
        { name: 'GATEWAY_SECRET_SSM', value: '/floci/auth/secret', type: 'PARAMETER_STORE' }
      ]
    },
    source: {
      type: 'GITHUB',
      location: 'https://github.com/floci-io/floci-auth-gateway.git'
    },
    serviceRole: 'arn:aws:iam::000000000000:role/codebuild-service-role',
    created: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
  },
  {
    name: 'floci-dashboard-bundler',
    description: 'Vite multi-stage bundle builder for Floci Cloud GUI core',
    environment: {
      type: 'LINUX_CONTAINER',
      image: 'aws/codebuild/standard:5.0',
      computeType: 'BUILD_GENERAL1_MEDIUM',
      environmentVariables: [
        { name: 'BUILD_TARGET', value: 'production-dist', type: 'PLAINTEXT' }
      ]
    },
    source: {
      type: 'S3',
      location: 'floci-deployment-bucket/src/dashboard-source.zip'
    },
    serviceRole: 'arn:aws:iam::000000000000:role/codebuild-service-role',
    created: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString()
  }
];

// Preloaded mock builds for dashboard visual representation
const PRELOADED_BUILDS: Record<string, CbBuild[]> = {
  'floci-auth-service-builder': [
    {
      id: 'floci-auth-service-builder:e51f0b09',
      projectName: 'floci-auth-service-builder',
      buildStatus: 'SUCCEEDED',
      startTime: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      endTime: new Date(Date.now() - 2 * 3600 * 1000 + 142 * 1000).toISOString(),
      durationInSeconds: 142,
      sourceVersion: 'main',
      phases: [
        { phaseType: 'SUBMITTED', phaseStatus: 'SUCCEEDED', durationInSeconds: 2 },
        { phaseType: 'PROVISIONING', phaseStatus: 'SUCCEEDED', durationInSeconds: 14 },
        { phaseType: 'DOWNLOAD_SOURCE', phaseStatus: 'SUCCEEDED', durationInSeconds: 8 },
        { phaseType: 'INSTALL', phaseStatus: 'SUCCEEDED', durationInSeconds: 42 },
        { phaseType: 'BUILD', phaseStatus: 'SUCCEEDED', durationInSeconds: 68 },
        { phaseType: 'UPLOAD_ARTIFACTS', phaseStatus: 'SUCCEEDED', durationInSeconds: 6 },
        { phaseType: 'FINALIZING', phaseStatus: 'SUCCEEDED', durationInSeconds: 2 }
      ]
    },
    {
      id: 'floci-auth-service-builder:b67c1d2e',
      projectName: 'floci-auth-service-builder',
      buildStatus: 'FAILED',
      startTime: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      endTime: new Date(Date.now() - 24 * 3600 * 1000 + 88 * 1000).toISOString(),
      durationInSeconds: 88,
      sourceVersion: 'feature-oauth',
      phases: [
        { phaseType: 'SUBMITTED', phaseStatus: 'SUCCEEDED', durationInSeconds: 1 },
        { phaseType: 'PROVISIONING', phaseStatus: 'SUCCEEDED', durationInSeconds: 12 },
        { phaseType: 'DOWNLOAD_SOURCE', phaseStatus: 'SUCCEEDED', durationInSeconds: 6 },
        { phaseType: 'INSTALL', phaseStatus: 'SUCCEEDED', durationInSeconds: 50 },
        { phaseType: 'BUILD', phaseStatus: 'FAILED', durationInSeconds: 19 }
      ]
    }
  ],
  'floci-dashboard-bundler': [
    {
      id: 'floci-dashboard-bundler:a91f3a2b',
      projectName: 'floci-dashboard-bundler',
      buildStatus: 'SUCCEEDED',
      startTime: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      endTime: new Date(Date.now() - 4 * 3600 * 1000 + 210 * 1000).toISOString(),
      durationInSeconds: 210,
      sourceVersion: 'v1.4.2',
      phases: [
        { phaseType: 'SUBMITTED', phaseStatus: 'SUCCEEDED', durationInSeconds: 3 },
        { phaseType: 'PROVISIONING', phaseStatus: 'SUCCEEDED', durationInSeconds: 18 },
        { phaseType: 'DOWNLOAD_SOURCE', phaseStatus: 'SUCCEEDED', durationInSeconds: 11 },
        { phaseType: 'INSTALL', phaseStatus: 'SUCCEEDED', durationInSeconds: 85 },
        { phaseType: 'BUILD', phaseStatus: 'SUCCEEDED', durationInSeconds: 79 },
        { phaseType: 'UPLOAD_ARTIFACTS', phaseStatus: 'SUCCEEDED', durationInSeconds: 12 },
        { phaseType: 'FINALIZING', phaseStatus: 'SUCCEEDED', durationInSeconds: 2 }
      ]
    }
  ]
};

interface EnvVarRow {
  name: string;
  value: string;
  type: 'PLAINTEXT' | 'PARAMETER_STORE' | 'SECRETS_MANAGER';
}

const CodeBuildView = () => {
  const { clients, logActivity } = useAws();
  
  // Projects State
  const [projects, setProjects] = useState<CbProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [projectSearch, setProjectSearch] = useState('');

  // Selected Project State
  const [selectedProjectName, setSelectedProjectName] = useState<string | null>(null);
  const [projectDetails, setProjectDetails] = useState<CbProject | null>(null);
  const [activeTab, setActiveTab] = useState<'builds' | 'config'>('builds');

  // Build Lists
  const [builds, setBuilds] = useState<CbBuild[]>([]);
  const [loadingBuilds, setLoadingBuilds] = useState(false);
  const [selectedBuild, setSelectedBuild] = useState<CbBuild | null>(null);

  // Manual Trigger Modal
  const [isTriggerOpen, setIsTriggerOpen] = useState(false);
  const [sourceVersion, setSourceVersion] = useState('main');
  const [envVars, setEnvVars] = useState<EnvVarRow[]>([]);
  const [buildspecOverride, setBuildspecOverride] = useState('');
  const [isLaunching, setIsLaunching] = useState(false);

  // Fetch projects from emulator or load mock values
  const fetchProjects = useCallback(async () => {
    setLoadingProjects(true);
    try {
      const res = await clients.codebuild.send(new ListProjectsCommand({}));
      const projectNames = res.projects || [];
      
      if (projectNames.length === 0) {
        setProjects(PRELOADED_PROJECTS);
        // Default select first preloaded
        if (!selectedProjectName) {
          handleProjectSelect(PRELOADED_PROJECTS[0]);
        }
      } else {
        const detailsRes = await clients.codebuild.send(new BatchGetProjectsCommand({
          names: projectNames
        }));
        const fetchedProjects = (detailsRes.projects || []) as unknown as CbProject[];
        setProjects(fetchedProjects);
        if (!selectedProjectName && fetchedProjects[0]) {
          handleProjectSelect(fetchedProjects[0]);
        }
      }
    } catch (err) {
      logActivity('CodeBuild', 'ListProjects failed, using preloaded catalog', 'success', err instanceof Error ? err.message : String(err));
      setProjects(PRELOADED_PROJECTS);
      if (!selectedProjectName) {
        handleProjectSelect(PRELOADED_PROJECTS[0]);
      }
    } finally {
      setLoadingProjects(false);
    }
  }, [clients.codebuild, logActivity]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleProjectSelect = (project: CbProject) => {
    setSelectedProjectName(project.name);
    setProjectDetails(project);
    fetchBuilds(project.name);
    setActiveTab('builds');
    setSelectedBuild(null);
  };

  // Fetch builds for project
  const fetchBuilds = async (projectName: string) => {
    setLoadingBuilds(true);
    setSelectedBuild(null);
    try {
      const res = await clients.codebuild.send(new ListBuildsForProjectCommand({
        projectName: projectName
      }));
      const buildIds = res.ids || [];
      
      if (buildIds.length === 0) {
        setBuilds(PRELOADED_BUILDS[projectName] || []);
      } else {
        const batchRes = await clients.codebuild.send(new BatchGetBuildsCommand({
          ids: buildIds.slice(0, 10)
        }));
        setBuilds((batchRes.builds || []) as unknown as CbBuild[]);
      }
    } catch {
      setBuilds(PRELOADED_BUILDS[projectName] || []);
    } finally {
      setLoadingBuilds(false);
    }
  };

  const handleAddEnvVar = () => {
    setEnvVars(prev => [...prev, { name: '', value: '', type: 'PLAINTEXT' }]);
  };

  const handleRemoveEnvVar = (index: number) => {
    setEnvVars(prev => prev.filter((_, i) => i !== index));
  };

  const handleEnvVarChange = (index: number, field: keyof EnvVarRow, val: string) => {
    setEnvVars(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val } as EnvVarRow;
      return next;
    });
  };

  const openTriggerModal = () => {
    setSourceVersion('main');
    setBuildspecOverride('');
    // Copy variables from project configuration
    const defaults = projectDetails?.environment?.environmentVariables?.map((v) => ({
      name: v.name,
      value: v.value,
      type: v.type || 'PLAINTEXT'
    })) || [];
    setEnvVars(defaults);
    setIsTriggerOpen(true);
  };

  const handleStartBuild = async () => {
    if (!selectedProjectName) return;
    setIsLaunching(true);
    try {
      const overrides: {
        sourceVersion?: string;
        buildspecOverride?: string;
        environmentVariablesOverride?: { name: string; value: string; type: 'PLAINTEXT' | 'PARAMETER_STORE' | 'SECRETS_MANAGER' }[];
      } = {};
      if (sourceVersion) overrides.sourceVersion = sourceVersion;
      if (buildspecOverride) overrides.buildspecOverride = buildspecOverride;
      
      const filteredVars = envVars.filter(v => v.name.trim().length > 0);
      if (filteredVars.length > 0) {
        overrides.environmentVariablesOverride = filteredVars.map(v => ({
          name: v.name,
          value: v.value,
          type: v.type
        }));
      }

      const res = await clients.codebuild.send(new StartBuildCommand({
        projectName: selectedProjectName,
        ...overrides
      }));

      logActivity('CodeBuild', `StartBuild: ${selectedProjectName}`, 'success', `Build ID: ${res.build?.id?.split(':').pop()}`);
      setIsTriggerOpen(false);
      
      // Inject running build at top of logs locally
      const runningBuild = {
        id: res.build?.id || `${selectedProjectName}:${Math.random().toString(36).substring(8)}`,
        projectName: selectedProjectName,
        buildStatus: 'IN_PROGRESS',
        startTime: new Date().toISOString(),
        sourceVersion: sourceVersion,
        phases: [
          { phaseType: 'SUBMITTED', phaseStatus: 'IN_PROGRESS', durationInSeconds: 1 }
        ]
      };
      
      setBuilds(prev => [runningBuild, ...prev]);
      setSelectedBuild(runningBuild);
      
      // Auto refresh in 5 seconds to get final state
      setTimeout(() => {
        fetchBuilds(selectedProjectName);
      }, 5000);
      
    } catch (err) {
      logActivity('CodeBuild', `StartBuild failed: ${selectedProjectName}`, 'error', err instanceof Error ? err.message : String(err));
      alert(`Launch build failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLaunching(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCEEDED': return 'text-brand-green border-brand-green bg-brand-green/5';
      case 'FAILED': return 'text-rose-600 border-rose-600 bg-rose-50';
      case 'IN_PROGRESS': return 'text-yellow-600 border-yellow-600 bg-yellow-50 animate-pulse';
      case 'STOPPED': return 'text-neutral-500 border-neutral-500 bg-neutral-100';
      default: return 'text-neutral-500 border-transparent';
    }
  };

  const filteredProjects = projects.filter(p => p.name.toLowerCase().includes(projectSearch.toLowerCase()));

  return (
    <div className="flex flex-col h-full uppercase font-sans">
      <PageHeader 
        title="CodeBuild Dashboard" 
        icon={<Hammer size={18} />}
        onRefresh={() => selectedProjectName && fetchBuilds(selectedProjectName)}
        isRefreshing={loadingBuilds}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar projects explorer */}
        <aside className="w-72 border-r border-brand-text flex flex-col bg-brand-muted shrink-0">
          <div className="p-4 border-b border-brand-text space-y-3 bg-brand-muted/50">
            <h3 className="font-bold text-[10px] tracking-widest text-brand-text opacity-70">Build Projects ({projects.length})</h3>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-brand-text opacity-30" size={13} />
              <Input 
                placeholder="Search projects..." 
                className="pl-8 text-[11px] font-mono"
                value={projectSearch}
                onChange={e => setProjectSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loadingProjects ? (
              [1, 2].map(i => <Skeleton key={i} className="h-9 w-full" />)
            ) : filteredProjects.length === 0 ? (
              <div className="text-[10px] text-center text-brand-text opacity-40 p-6 italic">No projects found</div>
            ) : (
              filteredProjects.map(p => (
                <button
                  key={p.name}
                  onClick={() => handleProjectSelect(p)}
                  className={`w-full text-left px-3 py-2 text-[11px] font-mono border transition-all ${
                    selectedProjectName === p.name 
                      ? 'bg-brand-text text-brand-bg border-brand-text font-bold shadow-xs' 
                      : 'border-transparent hover:bg-white/60 hover:border-brand-text/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">{p.name}</span>
                    <ChevronRight size={10} className={selectedProjectName === p.name ? 'text-brand-bg' : 'opacity-40'} />
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Right workspace detail */}
        <main className="flex-1 flex flex-col bg-brand-bg overflow-hidden relative">
          {!selectedProjectName ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-brand-bg/50">
              <div className="w-16 h-16 border border-brand-text/20 flex items-center justify-center text-brand-text/30 mb-4 bg-brand-muted/30">
                <Hammer size={30} />
              </div>
              <h3 className="font-serif-italic text-lg text-brand-text mb-2">No Project Selected</h3>
              <p className="text-[10px] text-brand-text opacity-50 uppercase max-w-sm tracking-wider">
                Select an active CodeBuild project from the sidebar to inspect build logs, configure variables, or run manual builds.
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Header Info Panel */}
              <div className="p-4 border-b border-brand-text bg-brand-muted/40 shrink-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold font-mono text-brand-text">{selectedProjectName}</h3>
                    <p className="text-[10px] text-brand-text opacity-60 mt-1 uppercase font-serif-italic normal-case">{projectDetails?.description || 'No description provided'}</p>
                  </div>
                  <Button 
                    onClick={openTriggerModal} 
                    icon={<Play size={12} />}
                    className="md:w-44"
                  >
                    Start Build
                  </Button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mt-4 border-t border-brand-text/20 pt-3">
                  {(['builds', 'config'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider border transition-all ${
                        activeTab === tab
                          ? 'bg-brand-text text-brand-bg border-brand-text'
                          : 'bg-transparent border-transparent hover:bg-brand-muted hover:border-brand-text/20'
                      }`}
                    >
                      {tab === 'builds' && 'Build History'}
                      {tab === 'config' && 'Environment Config'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Contents */}
              <div className="flex-1 overflow-hidden flex flex-col">
                {activeTab === 'builds' && (
                  <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                    {/* Build logs checklist timeline */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 border-r border-brand-text/10">
                      <h4 className="font-bold text-[10px] tracking-widest text-brand-text opacity-70 mb-3 border-b border-brand-text/15 pb-2">Recent Runs ({builds.length})</h4>
                      {loadingBuilds ? (
                        [1, 2].map(i => <Skeleton key={i} className="h-14 w-full" />)
                      ) : builds.length === 0 ? (
                        <div className="text-[10px] text-center italic text-brand-text opacity-35 py-12">No builds run for this project. Click start build above.</div>
                      ) : (
                        builds.map(b => {
                          const buildNum = b.id.split(':').pop() || b.id;
                          const isSelected = selectedBuild?.id === b.id;
                          return (
                            <button
                              key={b.id}
                              onClick={() => setSelectedBuild(b)}
                              className={`w-full text-left p-3 border font-mono text-[11px] transition-all flex items-center justify-between ${
                                isSelected 
                                  ? 'border-brand-text bg-white shadow-xs' 
                                  : 'border-brand-text/20 bg-brand-muted/10 hover:border-brand-text/50 hover:bg-white/40'
                              }`}
                            >
                              <div className="space-y-1">
                                <div className="font-bold text-brand-text flex items-center gap-2">
                                  <Clock size={12} className="opacity-60" />
                                  <span>#{buildNum}</span>
                                </div>
                                <div className="text-[9px] text-neutral-400">
                                  Branch: <span className="text-neutral-600 font-bold">{b.sourceVersion || 'main'}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="text-[9px] text-neutral-400">
                                  {b.durationInSeconds ? `${b.durationInSeconds}s` : 'running'}
                                </span>
                                <span className={`px-2 py-0.5 border text-[9px] font-bold ${getStatusColor(b.buildStatus)}`}>
                                  {b.buildStatus}
                                </span>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>

                    {/* Build phases visual details */}
                    <div className="w-96 overflow-y-auto p-4 bg-brand-muted/10 shrink-0">
                      {selectedBuild ? (
                        <div className="space-y-4">
                          <div className="border-b border-brand-text/20 pb-3">
                            <h4 className="font-bold text-[11px] font-mono text-brand-text">Run Details: #{selectedBuild.id.split(':').pop()}</h4>
                            <span className="text-[9px] text-neutral-400 font-mono block mt-1 lowercase truncate">{selectedBuild.id}</span>
                          </div>

                          <Card className="space-y-2">
                            <div className="flex justify-between text-[10px] font-mono">
                              <span className="opacity-60">Status:</span>
                              <span className="font-bold">{selectedBuild.buildStatus}</span>
                            </div>
                            <div className="flex justify-between text-[10px] font-mono">
                              <span className="opacity-60">Started:</span>
                              <span>{new Date(selectedBuild.startTime).toLocaleTimeString()}</span>
                            </div>
                            {selectedBuild.endTime && (
                              <div className="flex justify-between text-[10px] font-mono">
                                <span className="opacity-60">Finished:</span>
                                <span>{new Date(selectedBuild.endTime).toLocaleTimeString()}</span>
                              </div>
                            )}
                          </Card>

                          {/* Phase timelogs list */}
                          <div className="space-y-2">
                            <h5 className="font-bold text-[9px] tracking-widest text-brand-text/80 uppercase">Execution Phases</h5>
                            <div className="space-y-1.5 font-mono text-[10px]">
                              {selectedBuild.phases?.map((p, idx: number) => (
                                <div key={idx} className="flex justify-between items-center border border-brand-text/10 p-2 bg-white/60">
                                  <div className="flex items-center gap-2">
                                    <Activity size={10} className="text-brand-text/40" />
                                    <span className="font-bold lowercase text-[10px]">{p.phaseType}</span>
                                  </div>
                                  <div className="flex gap-2 items-center">
                                    {p.durationInSeconds && <span className="text-[9px] text-neutral-400">{p.durationInSeconds}s</span>}
                                    <span className={`px-1 text-[8px] font-bold ${
                                      p.phaseStatus === 'SUCCEEDED' ? 'text-brand-green bg-brand-green/10' :
                                      p.phaseStatus === 'FAILED' ? 'text-rose-600 bg-rose-50' : 'text-yellow-600 bg-yellow-50 animate-pulse'
                                    }`}>
                                      {p.phaseStatus || 'IN_PROGRESS'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center p-6 text-center text-brand-text opacity-40">
                          <Terminal size={24} className="mb-2 opacity-50" />
                          <div className="text-[10px] uppercase font-bold tracking-wider">Select a build run to inspect execution phases</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'config' && (
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-3xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Environment settings */}
                      <Card className="space-y-4">
                        <h4 className="font-bold text-[10px] tracking-widest text-brand-text opacity-70 border-b border-brand-text/20 pb-2 flex items-center gap-2">
                          <Cpu size={14} />
                          Environment Details
                        </h4>
                        <div className="space-y-2 font-mono text-[10px]">
                          <div className="flex justify-between border border-brand-text/5 p-2 bg-brand-muted/20">
                            <span className="opacity-60">Compute Type:</span>
                            <span className="font-bold">{projectDetails?.environment?.computeType}</span>
                          </div>
                          <div className="flex justify-between border border-brand-text/5 p-2 bg-brand-muted/20">
                            <span className="opacity-60">Image Profile:</span>
                            <span className="font-bold truncate max-w-[200px]" title={projectDetails?.environment?.image}>
                              {projectDetails?.environment?.image?.split('/').pop()}
                            </span>
                          </div>
                          <div className="flex justify-between border border-brand-text/5 p-2 bg-brand-muted/20">
                            <span className="opacity-60">Container Type:</span>
                            <span className="font-bold">{projectDetails?.environment?.type}</span>
                          </div>
                          <div className="flex justify-between border border-brand-text/5 p-2 bg-brand-muted/20">
                            <span className="opacity-60">Service IAM Role:</span>
                            <span className="font-bold truncate max-w-[200px]" title={projectDetails?.serviceRole}>
                              {projectDetails?.serviceRole?.split('/').pop()}
                            </span>
                          </div>
                        </div>
                      </Card>

                      {/* Source details */}
                      <Card className="space-y-4">
                        <h4 className="font-bold text-[10px] tracking-widest text-brand-text opacity-70 border-b border-brand-text/20 pb-2 flex items-center gap-2">
                          <Github size={14} />
                          Source Provider
                        </h4>
                        <div className="space-y-2 font-mono text-[10px]">
                          <div className="flex justify-between border border-brand-text/5 p-2 bg-brand-muted/20">
                            <span className="opacity-60">Source Provider:</span>
                            <span className="font-bold">{projectDetails?.source?.type}</span>
                          </div>
                          <div className="border border-brand-text/5 p-2 bg-brand-muted/20 space-y-1">
                            <span className="opacity-60 block">Repository / S3 Location:</span>
                            <span className="font-bold block lowercase text-neutral-600 break-all">{projectDetails?.source?.location}</span>
                          </div>
                        </div>
                      </Card>
                    </div>

                    {/* Environment Variables defaults config */}
                    <Card className="space-y-4">
                      <h4 className="font-bold text-[10px] tracking-widest text-brand-text opacity-70 border-b border-brand-text/20 pb-2 flex items-center gap-2">
                        <Settings size={14} />
                        Environment Variables ({projectDetails?.environment?.environmentVariables?.length || 0})
                      </h4>
                      {(projectDetails?.environment?.environmentVariables?.length || 0) > 0 ? (
                        <div className="space-y-1.5 font-mono text-[10px]">
                          <div className="flex text-neutral-400 font-bold border-b border-brand-text/10 pb-1.5 uppercase text-[9px]">
                            <div className="w-1/3">Var Name</div>
                            <div className="w-1/4">Type</div>
                            <div className="flex-1">Default Value</div>
                          </div>
                          {projectDetails?.environment?.environmentVariables?.map((v, idx: number) => (
                            <div key={idx} className="flex border border-brand-text/5 p-2 bg-brand-muted/15 items-center">
                              <div className="w-1/3 font-bold">{v.name}</div>
                              <div className="w-1/4"><span className="px-1 border text-[8px] bg-white text-neutral-500 font-bold">{v.type || 'PLAINTEXT'}</span></div>
                              <div className="flex-1 truncate max-w-xs text-neutral-600">{v.value}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[10px] text-center italic text-brand-text opacity-40 p-4 border border-dashed">No environment variables registered</div>
                      )}
                    </Card>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Trigger build override modal */}
      {isTriggerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-brand-bg border border-brand-text shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-brand-text bg-brand-muted">
              <h3 className="font-serif-italic text-lg">Start CodeBuild Job</h3>
              <button onClick={() => setIsTriggerOpen(false)} className="p-1 hover:bg-white border border-transparent hover:border-brand-text transition-all">
                <ChevronRight size={18} />
              </button>
            </div>
            
            <div className="p-6 space-y-4 max-h-[500px] overflow-y-auto pr-3 scrollbar-hide text-brand-text font-mono text-[10px]">
              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase opacity-60">Source Branch / Version (Git branch, commit, or tag)</label>
                <Input 
                  value={sourceVersion}
                  onChange={e => setSourceVersion(e.target.value)}
                  placeholder="main"
                  className="font-mono text-xs"
                />
              </div>

              {/* Dynamic Environment Variables overrides */}
              <div className="space-y-2">
                <label className="text-[9px] font-bold uppercase opacity-60 block">Environment Variables Override</label>
                <div className="flex text-neutral-400 font-bold uppercase text-[8px] border-b border-brand-text/10 pb-1">
                  <div className="w-1/3">Name</div>
                  <div className="w-1/4">Type</div>
                  <div className="flex-1">Value</div>
                  <div className="w-10">Delete</div>
                </div>

                <div className="space-y-1.5">
                  {envVars.map((v, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <div className="w-1/3">
                        <Input 
                          value={v.name}
                          onChange={e => handleEnvVarChange(index, 'name', e.target.value)}
                          placeholder="DB_HOST"
                          className="font-mono text-[10px]"
                        />
                      </div>
                      <div className="w-1/4">
                        <select
                          value={v.type}
                          onChange={e => handleEnvVarChange(index, 'type', e.target.value)}
                          className="w-full bg-white border border-brand-text px-2 py-1 text-[10px] focus:outline-none"
                        >
                          <option value="PLAINTEXT">Plaintext</option>
                          <option value="PARAMETER_STORE">SSM Parameter</option>
                          <option value="SECRETS_MANAGER">Secret Manager</option>
                        </select>
                      </div>
                      <div className="flex-1">
                        <Input 
                          value={v.value}
                          onChange={e => handleEnvVarChange(index, 'value', e.target.value)}
                          placeholder="value..."
                          className="font-mono text-[10px]"
                        />
                      </div>
                      <div className="w-10 flex justify-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveEnvVar(index)}
                          className="p-1 text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-400 rounded-sm"
                        >
                          <Plus size={10} className="rotate-45" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleAddEnvVar} 
                  icon={<Plus size={10} />}
                  className="mt-1"
                >
                  Add Custom Variable
                </Button>
              </div>

              {/* Buildspec override block */}
              <div className="space-y-1 pt-2">
                <label className="text-[9px] font-bold uppercase opacity-60 flex items-center gap-1">
                  <FileText size={10} />
                  Buildspec Configuration Override (Optional YAML)
                </label>
                <textarea
                  className="w-full bg-white border border-brand-text p-4 font-mono text-[10px] h-32 focus:outline-none placeholder:italic"
                  value={buildspecOverride}
                  onChange={e => setBuildspecOverride(e.target.value)}
                  placeholder={`version: 0.2\nphases:\n  build:\n    commands:\n      - echo "running manual build"`}
                />
              </div>

              <div className="flex gap-2 p-3 bg-amber-50 border border-amber-300 text-amber-900 leading-normal">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span className="uppercase text-[8px] font-bold">This overrides standard project settings for this specific execution only.</span>
              </div>
            </div>

            {/* Modal actions */}
            <div className="p-4 border-t border-brand-text bg-brand-muted flex gap-3">
              <Button variant="ghost" className="flex-1 text-xs" onClick={() => setIsTriggerOpen(false)}>Cancel</Button>
              <Button 
                className="flex-1 text-xs" 
                onClick={handleStartBuild} 
                disabled={isLaunching}
                icon={<Play size={12} />}
              >
                {isLaunching ? 'LAUNCHING...' : 'DISPATCH_BUILD'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CodeBuildView;
