import React, { useState, useEffect } from 'react';
import { ListPipelinesCommand, CreatePipelineCommand, DeletePipelineCommand, StartPipelineExecutionCommand } from '@aws-sdk/client-codepipeline';
import { useAws } from '../contexts/AwsContext';
import { Play, Search, CirclePlus, Trash2, ArrowRight, GitFork, RefreshCw, Layers, Shield } from 'lucide-react';
import { PageHeader, Card, Button, Input, Skeleton, Modal, Select } from '../components/ui-elements';

const CodePipelineView = () => {
  const { clients, logActivity } = useAws();
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Execution states for running visual pipelines in the UX
  const [runningExecs, setRunningExecs] = useState<Record<string, { stage: 'Source' | 'Build' | 'Deploy' | 'Succeeded', output: string[] }>>({});

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [sourceBucket, setSourceBucket] = useState('application-code-bucket');
  const [buildProj, setBuildProj] = useState('MyBuildProject');
  const [submitting, setSubmitting] = useState(false);

  const fetchPipelines = async () => {
    setLoading(true);
    try {
      const response = await clients.codepipeline.send(new ListPipelinesCommand({}));
      setPipelines(response.pipelines || []);
      logActivity('CodePipeline', 'ListPipelines', 'success');
    } catch (err: any) {
      logActivity('CodePipeline', 'ListPipelines failed', 'error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!name) return;
    setSubmitting(true);
    try {
      await clients.codepipeline.send(new CreatePipelineCommand({
        pipeline: {
          name: name,
          roleArn: 'arn:aws:iam::123456789012:role/CodePipelineServiceRole',
          artifactStore: {
            type: 'S3',
            location: 'codepipeline-artifacts'
          },
          stages: [
            {
              name: 'Source',
              actions: [
                {
                  name: 'S3_Retrieve',
                  actionTypeId: { category: 'Source', owner: 'AWS', provider: 'S3', version: '1' },
                  outputArtifacts: [{ name: 'SrcZip' }],
                  configuration: { S3Bucket: sourceBucket, S3ObjectKey: 'build.zip' }
                }
              ]
            },
            {
              name: 'Build',
              actions: [
                {
                  name: 'Build_Action',
                  actionTypeId: { category: 'Build', owner: 'AWS', provider: 'CodeBuild', version: '1' },
                  inputArtifacts: [{ name: 'SrcZip' }],
                  outputArtifacts: [{ name: 'CompiledOut' }],
                  configuration: { ProjectName: buildProj }
                }
              ]
            }
          ]
        }
      }));
      logActivity('CodePipeline', `CreatePipeline: ${name}`, 'success');
      setName('');
      setIsModalOpen(false);
      fetchPipelines();
    } catch (err: any) {
      logActivity('CodePipeline', `CreatePipeline failed: ${name}`, 'error', err.message);
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (pipeName: string) => {
    if (!confirm(`Delete pipeline ${pipeName}?`)) return;
    try {
      await clients.codepipeline.send(new DeletePipelineCommand({ name: pipeName }));
      logActivity('CodePipeline', `DeletePipeline: ${pipeName}`, 'success');
      fetchPipelines();
    } catch (err: any) {
      logActivity('CodePipeline', `DeletePipeline failed: ${pipeName}`, 'error', err.message);
      alert(err.message);
    }
  };

  const triggerPipeline = async (pipeName: string) => {
    try {
      const response = await clients.codepipeline.send(new StartPipelineExecutionCommand({ name: pipeName }));
      const execId = response.pipelineExecutionId || `exec-${Math.random().toString(36).substring(4)}`;
      logActivity('CodePipeline', `StartPipelineExecution: ${pipeName}`, 'success', execId);

      // Start visually progressing stages
      setRunningExecs(prev => ({
        ...prev,
        [pipeName]: { stage: 'Source', output: [`source trigger: ${execId}`] }
      }));

      setTimeout(() => {
        setRunningExecs(prev => {
          if (!prev[pipeName]) return prev;
          return { ...prev, [pipeName]: { stage: 'Build', output: [...prev[pipeName].output, 'source complete: s3 zip unpacked', 'beginning compile step'] } };
        });
      }, 3000);

      setTimeout(() => {
        setRunningExecs(prev => {
          if (!prev[pipeName]) return prev;
          return { ...prev, [pipeName]: { stage: 'Deploy', output: [...prev[pipeName].output, 'compiled package generated successfully', 'initiating hot reload/deployment'] } };
        });
      }, 6000);

      setTimeout(() => {
        setRunningExecs(prev => {
          if (!prev[pipeName]) return prev;
          return { ...prev, [pipeName]: { stage: 'Succeeded', output: [...prev[pipeName].output, 'deployment complete: service updated. status: 200/ok'] } };
        });
      }, 9000);

    } catch (err: any) {
      logActivity('CodePipeline', `StartPipelineExecution failed: ${pipeName}`, 'error', err.message);
      alert(err.message);
    }
  };

  useEffect(() => {
    fetchPipelines();
  }, []);

  const filteredPipelines = pipelines.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader
        title="CodePipeline Pipelines"
        icon={<GitFork size={18} />}
        onRefresh={fetchPipelines}
        isRefreshing={loading}
        actions={
          <Button onClick={() => setIsModalOpen(true)} icon={<CirclePlus size={14} />}>
            New Pipeline
          </Button>
        }
      />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Pipeline">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Pipeline Name</label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="main-branch-delivery"
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Source S3 Bucket</label>
            <Input
              value={sourceBucket}
              onChange={e => setSourceBucket(e.target.value)}
              placeholder="application-code-bucket"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Target Build Project</label>
            <Input
              value={buildProj}
              onChange={e => setBuildProj(e.target.value)}
              placeholder="MyBuildProject"
            />
          </div>

          <div className="pt-4 flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleCreate} disabled={!name || submitting}>
              {submitting ? 'Creating Pipeline...' : 'Create Pipeline'}
            </Button>
          </div>
        </div>
      </Modal>

      <div className="p-6 flex-1 overflow-auto bg-brand-bg space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text opacity-30" size={14} />
          <Input 
            placeholder="Search DevOps pipeline workflows..." 
            className="pl-10 font-mono text-[11px]" 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-6">
          {loading ? (
            [1, 2].map(i => <Skeleton key={i} className="h-32 animate-pulse" />)
          ) : filteredPipelines.length === 0 ? (
            <div className="py-20 text-center border border-dashed border-brand-text/20 bg-white">
               <p className="text-xs opacity-40 font-mono italic">NO_DEPLOYMENT_PIPELINES_DEFINED</p>
            </div>
          ) : (
            filteredPipelines.map(pipe => {
              const runState = runningExecs[pipe.name];
              const getStageStyle = (stageName: string, activeStage?: string) => {
                if (!activeStage) return 'border-brand-text/25 bg-white opacity-40 text-brand-text';
                if (activeStage === 'Succeeded') return 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold';
                
                if (stageName === activeStage) {
                  return 'border-blue-600 bg-blue-50 text-blue-800 font-bold animate-pulse';
                }

                const stagesList = ['Source', 'Build', 'Deploy'];
                const activeIndex = stagesList.indexOf(activeStage);
                const stageIndex = stagesList.indexOf(stageName);

                if (stageIndex < activeIndex) {
                  return 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold';
                }

                return 'border-brand-text/25 bg-white opacity-40 text-brand-text';
              };

              return (
                <Card key={pipe.name} className="hover:border-brand-text transition-all bg-white p-6 space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="space-y-1 min-w-0">
                      <h4 className="font-bold text-xs font-mono">{pipe.name}</h4>
                      <p className="text-[9px] font-mono opacity-50 truncate lowercase">version {pipe.version || '1'}</p>
                    </div>
                    <div className="flex gap-2 self-end sm:self-auto">
                      <Button 
                        size="sm" 
                        onClick={() => triggerPipeline(pipe.name)} 
                        disabled={runState && runState.stage !== 'Succeeded'}
                        icon={<Play size={10} />}
                      >
                        RELEASE_CHANGE
                      </Button>
                      <button 
                        onClick={() => handleDelete(pipe.name)} 
                        className="p-1.5 border border-brand-text/10 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 items-center gap-4 py-4 border-t border-b border-brand-text/10 bg-brand-muted/5 p-4 rounded-sm">
                    {/* Source Stage */}
                    <div className={`p-3 border text-center transition-all ${getStageStyle('Source', runState?.stage)}`}>
                      <span className="text-[10px] font-serif-italic block uppercase">Source</span>
                      <span className="text-[8px] font-mono opacity-60">S3 Retrieval</span>
                    </div>

                    <div className="hidden md:flex justify-center opacity-30">
                      <ArrowRight size={16} />
                    </div>

                    {/* Build Stage */}
                    <div className={`p-3 border text-center transition-all ${getStageStyle('Build', runState?.stage)}`}>
                      <span className="text-[10px] font-serif-italic block uppercase">Project Build</span>
                      <span className="text-[8px] font-mono opacity-60">CodeCompile</span>
                    </div>

                    <div className="hidden md:flex justify-center opacity-30">
                      <ArrowRight size={16} />
                    </div>

                    {/* Deploy Stage */}
                    <div className={`p-3 border text-center transition-all ${getStageStyle('Deploy', runState?.stage)}`}>
                      <span className="text-[10px] font-serif-italic block uppercase">Deploy</span>
                      <span className="text-[8px] font-mono opacity-60">S3 / ECS Sync</span>
                    </div>
                  </div>

                  {runState && (
                    <div className="bg-brand-console text-brand-green font-mono text-[9px] p-3 border border-brand-text rounded-xs space-y-1 normal-case max-h-32 overflow-y-auto scrollbar-hide">
                      {runState.output.map((out, i) => (
                        <div key={i}>{out}</div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default CodePipelineView;
