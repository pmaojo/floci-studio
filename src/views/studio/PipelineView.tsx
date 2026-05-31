import { useEffect, useState } from 'react';
import { Card, Button } from '../../components/ui-elements';
import { GitBranch, Play, Square, ChevronRight, Terminal, FileCode, AlertCircle, CheckCircle, Loader } from 'lucide-react';

type DeployStatus = 'INSTALLING' | 'RUNNING' | 'FAILED' | 'UNINSTALLING' | 'IDLE';

interface Deployment {
  recipeId: string;
  env: string;
  status: DeployStatus;
  vars: Record<string, string>;
  deployedAt?: string;
  error?: string | null;
}

interface Environment {
  name: string;
  type: 'local' | 'aws';
  portOffset: number;
  deployments: Record<string, Deployment>;
}

interface ManifestResult {
  hasCopilot: boolean;
  manifests: Record<string, string>;
}

const STATUS_COLOR: Record<DeployStatus, string> = {
  RUNNING:      'text-green-400',
  INSTALLING:   'text-yellow-400',
  UNINSTALLING: 'text-orange-400',
  FAILED:       'text-red-400',
  IDLE:         'text-slate-500',
};

const ENV_COLOR: Record<string, string> = {
  test:       'border-blue-500/40 bg-blue-950/20',
  demo:       'border-purple-500/40 bg-purple-950/20',
  production: 'border-amber-500/40 bg-amber-950/20',
};

const ENV_BADGE: Record<string, string> = {
  test:       'bg-blue-900/60 text-blue-300',
  demo:       'bg-purple-900/60 text-purple-300',
  production: 'bg-amber-900/60 text-amber-300',
};

function StatusIcon({ status }: { status: DeployStatus }) {
  if (status === 'RUNNING')    return <CheckCircle size={12} className="text-green-400" />;
  if (status === 'FAILED')     return <AlertCircle size={12} className="text-red-400" />;
  if (status === 'INSTALLING' || status === 'UNINSTALLING') return <Loader size={12} className="text-yellow-400 animate-spin" />;
  return null;
}

function LogModal({ env, recipeId, onClose }: { env: string; recipeId: string; onClose: () => void }) {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    fetch(`/sidecar/api/pipeline/logs/${env}/${recipeId}`)
      .then(r => r.json())
      .then(d => setLogs(d.logs || []));
    const t = setInterval(() =>
      fetch(`/sidecar/api/pipeline/logs/${env}/${recipeId}`)
        .then(r => r.json())
        .then(d => setLogs(d.logs || [])), 2000);
    return () => clearInterval(t);
  }, [env, recipeId]);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-brand-bg border border-brand-text w-full max-w-2xl max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-3 border-b border-brand-text">
          <span className="font-mono text-sm text-brand-text uppercase">{env}/{recipeId} logs</span>
          <Button size="sm" variant="ghost" onClick={onClose}>✕</Button>
        </div>
        <div className="flex-1 overflow-auto p-3 font-mono text-[11px] text-green-400 space-y-0.5 bg-brand-console">
          {logs.length === 0 && <div className="text-slate-500 italic">No logs yet…</div>}
          {logs.map((l, i) => <div key={i} className={l.startsWith('[SYSTEM]') ? 'text-yellow-400' : ''}>{l}</div>)}
        </div>
      </div>
    </div>
  );
}

function ManifestModal({ data, recipeId, onClose }: { data: ManifestResult; recipeId: string; onClose: () => void }) {
  const paths = Object.keys(data.manifests);
  const [selected, setSelected] = useState(paths[0] || '');

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-brand-bg border border-brand-text w-full max-w-3xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-3 border-b border-brand-text">
          <span className="font-mono text-sm text-brand-text uppercase">Copilot Manifests — {recipeId}</span>
          <Button size="sm" variant="ghost" onClick={onClose}>✕</Button>
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="w-56 border-r border-brand-text overflow-auto p-2 space-y-1 shrink-0">
            {paths.map(p => (
              <button key={p} onClick={() => setSelected(p)}
                className={`w-full text-left text-[10px] font-mono p-1.5 truncate ${selected === p ? 'bg-brand-text text-white' : 'text-slate-400 hover:text-white'}`}>
                {p}
              </button>
            ))}
          </div>
          <pre className="flex-1 overflow-auto p-3 text-[11px] font-mono text-green-300 bg-brand-console whitespace-pre">
            {data.manifests[selected] || ''}
          </pre>
        </div>
        <div className="p-3 border-t border-brand-text text-[10px] text-slate-500 font-mono">
          Apply: <span className="text-green-400">copilot svc deploy --name {recipeId} --env production</span>
        </div>
      </div>
    </div>
  );
}

export default function PipelineView() {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [logModal, setLogModal] = useState<{ env: string; recipeId: string } | null>(null);
  const [manifests, setManifests] = useState<{ recipeId: string; data: ManifestResult } | null>(null);
  const [actionMsg, setActionMsg] = useState('');

  const load = async () => {
    try {
      const res = await fetch('/sidecar/api/pipeline/environments');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setEnvironments(data.environments || []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, []);

  const deploy = async (recipeId: string, env: string) => {
    setActionMsg('');
    const res = await fetch('/sidecar/api/pipeline/deploy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipeId, env, vars: {} }),
    });
    const data = await res.json();
    if (!res.ok) setActionMsg(data.error || 'Deploy failed');
    else setActionMsg(`Deploying ${recipeId} → ${env}…`);
    load();
  };

  const teardown = async (recipeId: string, env: string) => {
    setActionMsg('');
    const res = await fetch(`/sidecar/api/pipeline/deploy/${env}/${recipeId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) setActionMsg(data.error || 'Teardown failed');
    else setActionMsg(`Tearing down ${recipeId} in ${env}…`);
    load();
  };

  const promote = async (recipeId: string, fromEnv: string, toEnv: string) => {
    setActionMsg('');
    const res = await fetch('/sidecar/api/pipeline/promote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipeId, fromEnv, toEnv }),
    });
    const data = await res.json();
    if (!res.ok) setActionMsg(data.error || 'Promote failed');
    else setActionMsg(`Promoting ${recipeId}: ${fromEnv} → ${toEnv}…`);
    load();
  };

  const showManifests = async (recipeId: string) => {
    const res = await fetch(`/sidecar/api/pipeline/manifests/${recipeId}`);
    const data = await res.json();
    if (res.ok) setManifests({ recipeId, data });
    else setActionMsg(data.error || 'Failed to generate manifests');
  };

  // Collect all recipe IDs across all environments
  const allRecipeIds = Array.from(new Set(
    environments.flatMap(e => Object.keys(e.deployments))
  )).sort();

  const getDeployment = (env: Environment, recipeId: string): Deployment | undefined =>
    env.deployments[recipeId];

  const canPromote = (recipeId: string, fromEnv: string, toEnv: string): boolean => {
    const from = environments.find(e => e.name === fromEnv);
    const to = environments.find(e => e.name === toEnv);
    if (!from || !to) return false;
    const fromDep = getDeployment(from, recipeId);
    const toDep = getDeployment(to, recipeId);
    return fromDep?.status === 'RUNNING' && (!toDep || toDep.status === 'IDLE' || toDep.status === 'FAILED');
  };

  return (
    <div className="space-y-6">
      {logModal && <LogModal env={logModal.env} recipeId={logModal.recipeId} onClose={() => setLogModal(null)} />}
      {manifests && <ManifestModal data={manifests.data} recipeId={manifests.recipeId} onClose={() => setManifests(null)} />}

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <GitBranch className="text-indigo-400" /> Deployment Pipeline
        </h1>
        <p className="text-slate-400">
          Promote marketplace recipes through test → demo → production. Local envs run isolated Docker Compose stacks with port offsets; production generates AWS Copilot and Terraform manifests.
        </p>
      </div>

      {/* Environment legend */}
      <div className="flex gap-3 flex-wrap text-[10px] font-mono uppercase">
        {['test (+10 000 ports)', 'demo (+20 000 ports)', 'production (manifests only)'].map((label, i) => {
          const env = ['test', 'demo', 'production'][i];
          return (
            <span key={env} className={`px-2 py-1 border ${ENV_BADGE[env]}`}>{label}</span>
          );
        })}
      </div>

      {actionMsg && (
        <div className="text-sm text-yellow-300 bg-yellow-900/20 border border-yellow-700/40 p-2 font-mono">{actionMsg}</div>
      )}

      {error && <div className="text-red-400 bg-red-900/20 p-3">{error}</div>}

      {loading && allRecipeIds.length === 0 && (
        <div className="text-slate-500 text-sm italic">Loading pipeline state…</div>
      )}

      {/* Pipeline board — one row per recipe */}
      {allRecipeIds.length > 0 && (
        <div className="space-y-4">
          {allRecipeIds.map(recipeId => (
            <Card key={recipeId} className="p-0">
              <div className="p-3 border-b border-brand-text flex items-center justify-between gap-2">
                <span className="font-mono text-sm text-brand-text font-bold uppercase tracking-wider">{recipeId}</span>
                <Button size="sm" variant="ghost" onClick={() => showManifests(recipeId)} icon={<FileCode size={12} />}>
                  Copilot Manifests
                </Button>
              </div>
              <div className="grid grid-cols-3 divide-x divide-brand-text">
                {environments.map((env, idx) => {
                  const dep = getDeployment(env, recipeId);
                  const status: DeployStatus = dep?.status ?? 'IDLE';
                  const nextEnv = environments[idx + 1]?.name;
                  const isProd = env.name === 'production';

                  return (
                    <div key={env.name} className={`p-3 space-y-2 ${ENV_COLOR[env.name]}`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-mono uppercase font-bold px-1.5 py-0.5 ${ENV_BADGE[env.name]}`}>
                          {env.name}
                        </span>
                        <div className="flex items-center gap-1">
                          <StatusIcon status={status} />
                          <span className={`text-[10px] font-mono ${STATUS_COLOR[status]}`}>{status}</span>
                        </div>
                      </div>

                      {dep && dep.status !== 'IDLE' && (
                        <div className="space-y-1">
                          {dep.deployedAt && (
                            <div className="text-[9px] text-slate-500 font-mono">
                              deployed {new Date(dep.deployedAt).toLocaleString()}
                            </div>
                          )}
                          {dep.error && (
                            <div className="text-[9px] text-red-400 font-mono truncate" title={dep.error}>{dep.error}</div>
                          )}
                          {!isProd && dep.vars && (
                            <div className="text-[9px] text-slate-600 font-mono">
                              {Object.entries(dep.vars).filter(([k]) => k.includes('PORT')).map(([k, v]) => (
                                <span key={k} className="mr-2">{k}={v}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex gap-1.5 flex-wrap">
                        {!isProd && status === 'IDLE' && (
                          <Button size="sm" onClick={() => deploy(recipeId, env.name)} icon={<Play size={11} />}>
                            Deploy
                          </Button>
                        )}
                        {!isProd && (status === 'RUNNING' || status === 'FAILED') && (
                          <Button size="sm" variant="danger" onClick={() => teardown(recipeId, env.name)} icon={<Square size={11} />}>
                            Teardown
                          </Button>
                        )}
                        {!isProd && status === 'RUNNING' && nextEnv && nextEnv !== 'production' && canPromote(recipeId, env.name, nextEnv) && (
                          <Button size="sm" variant="secondary" onClick={() => promote(recipeId, env.name, nextEnv)} icon={<ChevronRight size={11} />}>
                            → {nextEnv}
                          </Button>
                        )}
                        {isProd && (
                          <Button size="sm" variant="ghost" onClick={() => showManifests(recipeId)} icon={<FileCode size={11} />}>
                            Manifests
                          </Button>
                        )}
                        {!isProd && dep && dep.status !== 'IDLE' && (
                          <Button size="sm" variant="ghost" onClick={() => setLogModal({ env: env.name, recipeId })} icon={<Terminal size={11} />}>
                            Logs
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && allRecipeIds.length === 0 && (
        <Card>
          <div className="text-center py-8 space-y-2">
            <GitBranch size={32} className="text-slate-600 mx-auto" />
            <p className="text-slate-400 text-sm">No pipeline deployments yet.</p>
            <p className="text-slate-600 text-xs">
              Deploy a recipe from the Marketplace first, then promote it here through test → demo → production.
            </p>
            <p className="text-slate-600 text-xs mt-1">
              Or ask Claude: <span className="text-green-400 font-mono">"Deploy postgres to the test environment"</span>
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
