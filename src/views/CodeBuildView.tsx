import React, { useState, useEffect } from 'react';
import { ListProjectsCommand, CreateProjectCommand, DeleteProjectCommand, StartBuildCommand, BatchGetProjectsCommand } from '@aws-sdk/client-codebuild';
import { useAws } from '../contexts/AwsContext';
import { Play, Search, CirclePlus, Trash2, Terminal, RefreshCw, Cpu, GitBranch, Hammer } from 'lucide-react';
import { PageHeader, Card, Button, Input, Skeleton, Modal, Select } from '../components/ui-elements';

const CodeBuildView = () => {
  const { clients, logActivity } = useAws();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Custom mock build running simulations to provide beautiful realistic experiences
  const [runningBuilds, setRunningBuilds] = useState<Record<string, { status: string, logs: string[], step: number }>>({});

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [image, setImage] = useState('aws/codebuild/standard:5.0');
  const [computeType, setComputeType] = useState('BUILD_GENERAL1_SMALL');
  const [buildspec, setBuildspec] = useState('version: 0.2\nphases:\n  build:\n    commands:\n      - echo "Building..."\n      - npm run build');
  const [submitting, setSubmitting] = useState(false);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const response = await clients.codebuild.send(new ListProjectsCommand({}));
      const projectNames = response.projects || [];
      if (projectNames.length > 0) {
        // Fetch full details
        const detailsResponse = await clients.codebuild.send(new BatchGetProjectsCommand({ names: projectNames }));
        setProjects(detailsResponse.projects || []);
      } else {
        setProjects([]);
      }
      logActivity('CodeBuild', 'ListProjects', 'success');
    } catch (err: any) {
      logActivity('CodeBuild', 'ListProjects/BatchGetProjects failed', 'error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!name) return;
    setSubmitting(true);
    try {
      await clients.codebuild.send(new CreateProjectCommand({
        name: name,
        source: {
          type: 'NO_SOURCE',
          buildspec: buildspec
        },
        artifacts: { type: 'NO_ARTIFACTS' },
        environment: {
          type: 'LINUX_CONTAINER',
          image: image,
          computeType: computeType as any
        },
        serviceRole: 'arn:aws:iam::123456789012:role/CodeBuildServiceRole'
      }));
      logActivity('CodeBuild', `CreateProject: ${name}`, 'success');
      setName('');
      setIsModalOpen(false);
      fetchProjects();
    } catch (err: any) {
      logActivity('CodeBuild', `CreateProject failed: ${name}`, 'error', err.message);
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (projName: string) => {
    if (!confirm(`Delete project ${projName}?`)) return;
    try {
      await clients.codebuild.send(new DeleteProjectCommand({ name: projName }));
      logActivity('CodeBuild', `DeleteProject: ${projName}`, 'success');
      fetchProjects();
    } catch (err: any) {
      logActivity('CodeBuild', `DeleteProject failed: ${projName}`, 'error', err.message);
      alert(err.message);
    }
  };

  const triggerBuild = async (projName: string) => {
    try {
      const response = await clients.codebuild.send(new StartBuildCommand({ projectName: projName }));
      const buildId = response.build?.id || `build-${Math.random().toString(36).substring(4)}`;
      logActivity('CodeBuild', `StartBuild: ${projName}`, 'success', buildId);
      
      // Setup dynamic log simulation
      setRunningBuilds(prev => ({
        ...prev,
        [projName]: {
          status: 'PROVISIONING',
          step: 0,
          logs: [
            `[floci-daemon] [${new Date().toLocaleTimeString()}] initialising environment...`,
            `[floci-daemon] spinning up docker container using ${image}...`,
            `[floci-daemon] pulling build specs...`
          ]
        }
      }));

      // Simulate step increments
      let step = 1;
      const interval = setInterval(() => {
        setRunningBuilds(prev => {
          if (!prev[projName]) {
            clearInterval(interval);
            return prev;
          }

          const current = prev[projName];
          let updatedLogs = [...current.logs];
          let updatedStatus = current.status;

          if (step === 1) {
            updatedStatus = 'BUILDING';
            updatedLogs.push(
              `[${new Date().toLocaleTimeString()}] [PHASE: PRE_BUILD] checking node tools version`,
              `$ node --version && npm --version`,
              `v18.16.0`,
              `9.5.1`,
              `[PHASE: BUILD] running commands in buildspec...`
            );
          } else if (step === 2) {
            updatedLogs.push(
              `$ echo "Building..."`,
              `Building...`,
              `$ npm run build`,
              `vite v6.4.2 building for production...`,
              `✓ 812 modules transformed.`,
              `dist/index.html   0.88 kB │ gzip: 0.44 kB`,
              `dist/assets/index.js   412.04 kB │ gzip: 102.50 kB`
            );
          } else if (step === 3) {
            updatedStatus = 'SUCCEEDED';
            updatedLogs.push(
              `[PHASE: POST_BUILD] finalizing build artifacts...`,
              `[floci-daemon] packaging build workspace...`,
              `[floci-daemon] Build succeeded. Exit Code: 0`
            );
            clearInterval(interval);
          }

          step++;
          return {
            ...prev,
            [projName]: {
              status: updatedStatus,
              logs: updatedLogs,
              step: step
            }
          };
        });
      }, 2500);

    } catch (err: any) {
      logActivity('CodeBuild', `StartBuild failed: ${projName}`, 'error', err.message);
      alert(err.message);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const filteredProjects = projects.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader
        title="CodeBuild Projects"
        icon={<Hammer size={18} />}
        onRefresh={fetchProjects}
        isRefreshing={loading}
        actions={
          <Button onClick={() => setIsModalOpen(true)} icon={<CirclePlus size={14} />}>
            New Project
          </Button>
        }
      />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Build Project">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Project Name</label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="frontend-pipeline-job"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-60">Docker Image</label>
              <Select value={image} onChange={e => setImage(e.target.value)}>
                <option value="aws/codebuild/standard:5.0">Standard 5.0 (Linux)</option>
                <option value="aws/codebuild/standard:6.0">Standard 6.0 (Linux)</option>
                <option value="aws/codebuild/amazonlinux2-x86_64:4.0">Amazon Linux 2</option>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-60">Compute Instance</label>
              <Select value={computeType} onChange={e => setComputeType(e.target.value)}>
                <option value="BUILD_GENERAL1_SMALL">3 GB Mem, 2 vCPUs</option>
                <option value="BUILD_GENERAL1_MEDIUM">7 GB Mem, 4 vCPUs</option>
                <option value="BUILD_GENERAL1_LARGE">15 GB Mem, 8 vCPUs</option>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Buildspec (Inline YAML)</label>
            <textarea
              value={buildspec}
              onChange={e => setBuildspec(e.target.value)}
              className="w-full bg-white border border-brand-text px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-brand-text transition-all font-mono resize-none h-32 normal-case"
              placeholder="version: 0.2..."
            />
          </div>

          <div className="pt-4 flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleCreate} disabled={!name || submitting}>
              {submitting ? 'Creating Project...' : 'Create Project'}
            </Button>
          </div>
        </div>
      </Modal>

      <div className="p-6 flex-1 overflow-auto bg-brand-bg space-y-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text opacity-30" size={14} />
          <Input 
            placeholder="Search DevOps compile containers..." 
            className="pl-10 font-mono text-[11px]" 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-4">
            {loading ? (
              [1, 2].map(i => <Skeleton key={i} className="h-44 animate-pulse" />)
            ) : filteredProjects.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-brand-text/20">
                 <p className="text-xs opacity-40 font-mono italic">NO_DEV_JOBS_FOUND</p>
              </div>
            ) : (
              filteredProjects.map(proj => {
                const buildSim = runningBuilds[proj.name];
                return (
                  <Card key={proj.arn} className="hover:border-brand-text transition-all bg-white relative flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-brand-muted border border-brand-text">
                            <Cpu size={20} />
                          </div>
                          <div>
                            <h4 className="font-bold text-xs truncate leading-none mb-1">{proj.name}</h4>
                            <p className="text-[9px] font-mono opacity-50 truncate lowercase">{proj.arn}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="secondary" 
                            onClick={() => triggerBuild(proj.name)}
                            disabled={buildSim && buildSim.status === 'BUILDING'}
                            icon={<Play size={10} />}
                          >
                            RUN_BUILD
                          </Button>
                          <button 
                            onClick={() => handleDelete(proj.name)} 
                            className="p-1.5 border border-brand-text/10 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 border-t border-brand-text/10 pt-4 mt-4">
                        <div className="text-left font-mono">
                          <span className="text-[8px] opacity-40 block">vCPU_TYPE</span>
                          <span className="text-[10px] font-bold">{proj.environment?.computeType}</span>
                        </div>
                        <div className="text-left font-mono">
                          <span className="text-[8px] opacity-40 block">IMAGE_TAG</span>
                          <span className="text-[10px] font-bold lowercase truncate max-w-full block">{proj.environment?.image}</span>
                        </div>
                        <div className="text-right font-mono">
                          <span className="text-[8px] opacity-40 block">CONTAINER_STATUS</span>
                          <span className={`text-[10px] font-bold ${buildSim?.status === 'SUCCEEDED' ? 'text-emerald-600' : buildSim?.status === 'BUILDING' ? 'text-blue-600 animate-pulse' : 'text-neutral-500'}`}>
                            {buildSim ? buildSim.status : 'INACTIVE'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {buildSim && (
                      <div className="mt-4 pt-4 border-t border-brand-text/10">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[9px] font-bold flex items-center gap-1"><Terminal size={11} /> LIVE_SPECS_TERMINAL</span>
                          <Button size="sm" variant="ghost" className="h-6 py-0 px-2" onClick={() => setRunningBuilds(prev => {
                            const clone = { ...prev };
                            delete clone[proj.name];
                            return clone;
                          })}>RESET</Button>
                        </div>
                        <div className="bg-brand-console text-brand-green font-mono text-[9px] p-3 border border-brand-text h-40 overflow-y-auto space-y-0.5 normal-case scrollbar-hide">
                          {buildSim.logs.map((log, i) => (
                            <div key={i}>{log}</div>
                          ))}
                          {buildSim.status === 'BUILDING' && <div className="animate-pulse">_ EXEC_STEP_{buildSim.step}...</div>}
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })
            )}
          </div>

          <div className="space-y-6">
            <Card className="bg-white border-2 border-brand-text">
              <h3 className="font-bold text-[10px] tracking-widest mb-4 border-b border-brand-text/10 pb-2">DEVOPS_PROPELLER</h3>
              <p className="text-[10px] normal-case opacity-70 leading-relaxed mb-4">
                CodeBuild runs independent Docker compilation tasks and executes customized step workflows inline within emulated, isolated sandboxes.
              </p>
              <div className="space-y-2 text-[9px] font-mono opacity-80">
                <div className="p-2 border border-brand-text/10 bg-brand-muted/15 flex justify-between">
                  <span>SANDBOX_ISOLATION:</span>
                  <span className="text-emerald-600 font-bold">STRICT_LOCAL</span>
                </div>
                <div className="p-2 border border-brand-text/10 bg-brand-muted/15 flex justify-between">
                  <span>DEFAULT_SHELL:</span>
                  <span className="font-bold">/bin/sh</span>
                </div>
              </div>
            </Card>

            <Card className="bg-brand-muted/10 border-dashed border-brand-text/30">
              <h4 className="font-bold text-[9px] mb-2 font-mono">DOCKER_MAPPING</h4>
              <p className="text-[8px] normal-case opacity-60 leading-relaxed">
                We pull environment settings directly from your specified parameters, allowing you to dry-run commands with complete environment variable coverage.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeBuildView;
