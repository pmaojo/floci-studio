import { useState, useEffect, useRef } from 'react';
import { 
  sidecarApi, 
  type Recipe, 
  type Installation 
} from '../lib/sidecarApi';
import { PageHeader, Card, Button, Input, Skeleton, Modal } from '../components/ui-elements';
import { 
  Cpu, 
  RefreshCw, 
  Terminal, 
  ExternalLink, 
  AlertCircle, 
  CheckCircle2, 
  Settings, 
  Key,
  Database,
  Trash2,
  Cloud
} from 'lucide-react';
import { useAws } from '../contexts/AwsContext';

const MarketplaceView = () => {
  const { logActivity } = useAws();
  
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [installations, setInstallations] = useState<Record<string, Installation>>({});
  const [loading, setLoading] = useState(true);
  
  // Modal / config drawer states
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [configVars, setConfigVars] = useState<Record<string, any>>({});
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  
  // Terminal logs state
  const [terminalRecipeId, setTerminalRecipeId] = useState<string | null>(null);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [isTerminalModalOpen, setIsTerminalModalOpen] = useState(false);
  
  const logEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch active recipes and installations
  const fetchData = async () => {
    try {
      const [recipesRes, instRes] = await Promise.all([
        sidecarApi.listRecipes(),
        sidecarApi.getInstallations()
      ]);
      
      if (recipesRes.ok) setRecipes(recipesRes.recipes);
      if (instRes.ok) setInstallations(instRes.installations);
      logActivity('Marketplace', 'Fetch catalog and status', 'success');
    } catch (err: unknown) {
      logActivity('Marketplace', 'Fetch catalog failed', 'error', err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  // Poll installations states and logs when running transitions
  useEffect(() => {
    fetchData();
    
    // Poll status every 4 seconds to catch background docker compose changes
    const interval = setInterval(async () => {
      try {
        const instRes = await sidecarApi.getInstallations();
        if (instRes.ok) {
          setInstallations(instRes.installations);
        }
      } catch {
        // Suppress background errors
      }
    }, 4000);

    return () => {
      clearInterval(interval);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // Poll logs for active terminal
  const fetchLogs = async (recipeId: string) => {
    try {
      const res = await sidecarApi.getRecipeLogs(recipeId);
      if (res.ok) {
        setTerminalLogs(res.logs);
        // Scroll terminal to bottom
        setTimeout(() => {
          logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch {
      // Suppress logging errors
    }
  };

  const openTerminal = (recipeId: string) => {
    setTerminalRecipeId(recipeId);
    setTerminalLogs([]);
    setIsTerminalModalOpen(true);
    fetchLogs(recipeId);
    
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(() => {
      fetchLogs(recipeId);
    }, 2000);
  };

  const closeTerminal = () => {
    setIsTerminalModalOpen(false);
    setTerminalRecipeId(null);
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  // Pre-configure and open installer modal
  const handleOpenInstaller = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    
    // Initialize default variables
    const defaults: Record<string, any> = {};
    recipe.variables.forEach(v => {
      defaults[v.key] = v.default;
    });
    
    setConfigVars(defaults);
    setIsConfigModalOpen(true);
  };

  // Run recipe installation
  const handleInstall = async () => {
    if (!selectedRecipe) return;
    
    const recipeId = selectedRecipe.id;
    setIsConfigModalOpen(false);
    
    try {
      // Trigger sidecar to deploy in background
      await sidecarApi.installRecipe(recipeId, configVars);
      logActivity('Marketplace', `Install: ${recipeId}`, 'success');
      
      // Auto-open live terminal to show logs immediately
      openTerminal(recipeId);
      fetchData();
    } catch (err: unknown) {
      logActivity('Marketplace', `Install failed: ${recipeId}`, 'error', err instanceof Error ? err.message : String(err));
      alert(`Deployment failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Run recipe uninstallation / cleanup
  const handleUninstall = async (recipeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Tear down and remove all containers/volumes for "${recipeId}"?`)) return;
    
    try {
      await sidecarApi.uninstallRecipe(recipeId);
      logActivity('Marketplace', `Uninstall: ${recipeId}`, 'success');
      
      // Auto-open terminal to watch downlogs
      openTerminal(recipeId);
      fetchData();
    } catch (err: unknown) {
      logActivity('Marketplace', `Uninstall failed: ${recipeId}`, 'error', err instanceof Error ? err.message : String(err));
      alert(`Teardown failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Get external access URL
  const getAppUrl = (recipeId: string) => {
    const inst = installations[recipeId];
    if (!inst || !inst.vars) return null;
    
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe || !recipe.accessUrl) {
      const port = inst.vars.KEYCLOAK_PORT || 8080;
      return `http://localhost:${port}`;
    }

    let url = recipe.accessUrl;
    for (const [key, value] of Object.entries(inst.vars)) {
      url = url.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), String(value));
    }
    return url;
  };

  const getStatusBadge = (status: Installation['status']) => {
    switch (status) {
      case 'RUNNING':
        return (
          <span className="flex items-center gap-1 text-[8px] font-bold border border-emerald-600 bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
            <CheckCircle2 size={10} className="text-emerald-700 animate-pulse" /> RUNNING
          </span>
        );
      case 'INSTALLING':
        return (
          <span className="flex items-center gap-1 text-[8px] font-bold border border-amber-600 bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded-sm uppercase tracking-wider animate-pulse">
            <RefreshCw size={10} className="text-amber-700 animate-spin" /> INSTALLING
          </span>
        );
      case 'UNINSTALLING':
        return (
          <span className="flex items-center gap-1 text-[8px] font-bold border border-amber-600 bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded-sm uppercase tracking-wider animate-pulse">
            <RefreshCw size={10} className="text-amber-700 animate-spin" /> TEARING DOWN
          </span>
        );
      case 'FAILED':
        return (
          <span className="flex items-center gap-1 text-[8px] font-bold border border-rose-600 bg-rose-50 text-rose-800 px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
            <AlertCircle size={10} className="text-rose-700" /> FAILED
          </span>
        );
      default:
        return (
          <span className="text-[8px] font-bold border border-neutral-300 bg-neutral-50 text-neutral-600 px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
            IDLE
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader 
        title="Software Marketplace" 
        icon={<Cpu size={18} />}
        onRefresh={fetchData}
        isRefreshing={loading}
      />

      {/* Config Customization Slide Modal */}
      <Modal 
        isOpen={isConfigModalOpen} 
        onClose={() => setIsConfigModalOpen(false)} 
        title={`Deploy ${selectedRecipe?.name}`}
      >
        {selectedRecipe && (
          <div className="space-y-4">
            <p className="text-[10px] opacity-60 normal-case mb-4">
              Configure las variables de entorno iniciales para levantar el contenedor:
            </p>
            {selectedRecipe.variables.map(v => (
              <div key={v.key} className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase opacity-80 flex items-center gap-1">
                  {v.key.includes('PASS') ? <Key size={10} /> : v.key.includes('PORT') ? <Settings size={10} /> : <Database size={10} />}
                  {v.label}
                </label>
                <Input 
                  type={v.type}
                  value={configVars[v.key] ?? ''}
                  onChange={e => setConfigVars({
                    ...configVars,
                    [v.key]: v.type === 'number' ? Number(e.target.value) : e.target.value
                  })}
                  placeholder={String(v.default)}
                />
                <p className="text-[8px] text-neutral-400 normal-case leading-normal">{v.description}</p>
              </div>
            ))}
            <div className="pt-6 flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => setIsConfigModalOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleInstall}>
                Launch Stack
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Retro Console Terminal Modal */}
      <Modal 
        isOpen={isTerminalModalOpen} 
        onClose={closeTerminal} 
        title={`Docker logs: ${terminalRecipeId}`}
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="w-full h-80 bg-brand-console text-brand-green p-4 border border-brand-text font-mono text-[9px] overflow-auto flex flex-col justify-start rounded-xs select-text normal-case tracking-wide">
            {terminalLogs.length === 0 ? (
              <div className="text-brand-green opacity-40 animate-pulse">Initializing streaming socket...</div>
            ) : (
              terminalLogs.map((log, index) => (
                <div key={index} className="leading-relaxed py-0.5 truncate last:opacity-100 last:font-bold">
                  {log}
                </div>
              ))
            )}
            <div ref={logEndRef} />
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={closeTerminal}>Close Console</Button>
          </div>
        </div>
      </Modal>

      <div className="p-6 flex-1 overflow-auto bg-brand-bg">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            [1].map(i => <Skeleton key={i} className="h-44" />)
          ) : recipes.length === 0 ? (
            <div className="col-span-full py-24 text-center border border-dashed border-brand-text/20">
               <p className="text-xs opacity-40 font-mono italic">NO_MARKETPLACE_RECIPES_CONFIGURED</p>
            </div>
          ) : (
            recipes.map(recipe => {
              const inst = installations[recipe.id] || { status: 'IDLE' };
              const isBusy = inst.status === 'INSTALLING' || inst.status === 'UNINSTALLING';
              
              return (
                <Card 
                  key={recipe.id} 
                  className="hover:border-brand-text transition-all bg-white flex flex-col justify-between p-5 min-h-[190px]"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="p-2.5 bg-brand-muted border border-brand-text shrink-0">
                        <Cpu size={24} className="text-brand-text" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        {getStatusBadge(inst.status)}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm tracking-tight text-brand-text leading-tight">{recipe.name}</h4>
                      <p className="text-[8px] font-mono opacity-40 mt-1">VERSION: {recipe.version}</p>
                      <p className="text-[9px] text-neutral-500 normal-case mt-2.5 leading-relaxed font-sans font-medium">
                        {recipe.description}
                      </p>
                      {recipe.aws && (
                        <div
                          className="mt-3 flex items-start gap-1.5 border border-brand-text/10 bg-brand-muted/40 px-2 py-1.5"
                          title={`${recipe.aws.parity}\n\nDeploy: ${recipe.aws.deploy}`}
                        >
                          <Cloud size={11} className="text-brand-text/60 shrink-0 mt-px" />
                          <span className="font-mono text-[8px] font-bold uppercase tracking-wide text-brand-text/70 leading-tight">
                            Deploys to {recipe.aws.service}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-brand-text/5 flex items-center justify-between gap-3">
                    {/* Log Terminal Trigger */}
                    {inst.status !== 'IDLE' && (
                      <button 
                        onClick={() => openTerminal(recipe.id)}
                        className="flex items-center gap-1.5 font-mono text-[9px] font-bold border border-brand-text/10 hover:border-brand-text hover:bg-neutral-50 p-2.5 transition-colors"
                      >
                        <Terminal size={12} /> Watch Logs
                      </button>
                    )}

                    {/* Operational controls */}
                    <div className="flex gap-2 ml-auto">
                      {inst.status === 'RUNNING' && (
                        <>
                          <a 
                            href={getAppUrl(recipe.id) || '#'}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[9px] bg-brand-text text-brand-bg hover:opacity-90 px-3.5 py-2"
                          >
                            Open Web <ExternalLink size={12} />
                          </a>
                          <button 
                            onClick={(e) => handleUninstall(recipe.id, e)}
                            className="p-2.5 border border-brand-text hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                      
                      {inst.status === 'FAILED' && (
                        <>
                          <Button size="sm" onClick={() => handleOpenInstaller(recipe)}>Retry Setup</Button>
                          <button 
                            onClick={(e) => handleUninstall(recipe.id, e)}
                            className="p-2.5 border border-brand-text hover:bg-neutral-50 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}

                      {inst.status === 'IDLE' && (
                        <Button onClick={() => handleOpenInstaller(recipe)}>Launch App</Button>
                      )}

                      {isBusy && (
                        <span className="text-[9px] font-mono font-bold opacity-30 p-2 text-brand-text uppercase animate-pulse">
                          Deploying...
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default MarketplaceView;
