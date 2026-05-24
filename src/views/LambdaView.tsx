import { useEffect, useMemo, useState } from 'react';
import { Zap, Search, CirclePlus } from 'lucide-react';
import { useAws } from '../contexts/AwsContext';
import { PageHeader, Card, Button, Input, Skeleton } from '../components/ui-elements';
import { fileToBase64, sidecarApi, type LambdaCapabilities, type LambdaCodeInput } from '../lib/sidecarApi';
import {
  applyRuntimeTemplate,
  fallbackCapabilities,
  type LambdaConfigDraft,
  type LambdaFunctionRecord,
  type LambdaSourceMode,
} from './lambda/types';
import { CreateLambdaModal, CodeUpdateModal } from './lambda/PackageUploadModal';
import { ConfigModal } from './lambda/ConfigModal';
import { FunctionCard } from './lambda/FunctionCard';
import { ResultPanel } from './lambda/Field';

const buildCodeInput = async (
  mode: LambdaSourceMode,
  fileName: string,
  source: string,
  file: File | null,
): Promise<LambdaCodeInput> => {
  if (mode === 'template') return { mode: 'template' };
  if (mode === 'inline') return { mode: 'inline', fileName, source };
  if (!file) throw new Error('Select a deployment ZIP first');
  return { mode: 'zipBase64', zipBase64: await fileToBase64(file) };
};

const LambdaView = () => {
  const { logActivity } = useAws();
  const [capabilities, setCapabilities] = useState<LambdaCapabilities>(fallbackCapabilities);
  const [functions, setFunctions] = useState<LambdaFunctionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [invoking, setInvoking] = useState<string | null>(null);
  const [invokeResult, setInvokeResult] = useState<unknown>(null);
  const [logsResult, setLogsResult] = useState<unknown>(null);
  const [workingFunction, setWorkingFunction] = useState<string | null>(null);

  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);
  const [newFuncName, setNewFuncName] = useState('');
  const [runtime, setRuntime] = useState('nodejs18.x');
  const [handler, setHandler] = useState('index.handler');
  const [role, setRole] = useState(fallbackCapabilities.defaultRoleArn);
  const [description, setDescription] = useState('Created via Floci UI sidecar');
  const [memory, setMemory] = useState('128');
  const [timeout, setTimeoutVal] = useState('3');
  const [sourceMode, setSourceMode] = useState<LambdaSourceMode>('template');
  const [sourceFileName, setSourceFileName] = useState('index.js');
  const [sourceCode, setSourceCode] = useState(fallbackCapabilities.templates[0]?.source ?? '');
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [codeTarget, setCodeTarget] = useState<LambdaFunctionRecord | null>(null);
  const [updateSourceMode, setUpdateSourceMode] = useState<LambdaSourceMode>('inline');
  const [updateSourceFileName, setUpdateSourceFileName] = useState('index.js');
  const [updateSourceCode, setUpdateSourceCode] = useState(fallbackCapabilities.templates[0]?.source ?? '');
  const [updateZipFile, setUpdateZipFile] = useState<File | null>(null);

  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [configTarget, setConfigTarget] = useState<LambdaFunctionRecord | null>(null);
  const [configDraft, setConfigDraft] = useState<LambdaConfigDraft>({
    runtime: 'nodejs18.x',
    handler: 'index.handler',
    role: fallbackCapabilities.defaultRoleArn,
    description: '',
    timeout: '3',
    memorySize: '128',
  });

  const filteredFunctions = useMemo(() => (
    functions.filter(fn => fn.FunctionName?.toLowerCase().includes(search.toLowerCase()))
  ), [functions, search]);

  const fetchFunctions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await sidecarApi.listLambdaFunctions();
      setFunctions((response.Functions || []) as LambdaFunctionRecord[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch functions from sidecar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const nextCapabilities = await sidecarApi.getLambdaCapabilities();
        setCapabilities(nextCapabilities);
        setRole(nextCapabilities.defaultRoleArn);
        applyRuntimeTemplate(nextCapabilities, runtime, setHandler, setSourceFileName, setSourceCode);
      } catch (err) {
        setError(err instanceof Error ? `Sidecar unavailable: ${err.message}` : 'Sidecar unavailable');
      } finally {
        fetchFunctions();
      }
    };
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRuntimeChange = (nextRuntime: string) => {
    setRuntime(nextRuntime);
    const option = capabilities.runtimes.find(item => item.value === nextRuntime);
    if (!option?.supportsTemplate && sourceMode === 'template') setSourceMode('zipBase64');
    applyRuntimeTemplate(capabilities, nextRuntime, setHandler, setSourceFileName, setSourceCode);
  };

  const handleCreate = async () => {
    if (!newFuncName) return;
    setIsCreating(true);
    try {
      await sidecarApi.createLambdaFunction({
        functionName: newFuncName,
        runtime,
        handler,
        role,
        description,
        timeout: parseInt(timeout, 10),
        memorySize: parseInt(memory, 10),
        code: await buildCodeInput(sourceMode, sourceFileName, sourceCode, zipFile),
      });
      logActivity('Lambda', `CreateFunction: ${newFuncName}`, 'success', 'sidecar/aws-cli');
      setNewFuncName('');
      setZipFile(null);
      setDescription('Created via Floci UI sidecar');
      setIsCreationModalOpen(false);
      fetchFunctions();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logActivity('Lambda', `CreateFunction failed: ${newFuncName}`, 'error', message);
      alert(message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleInvoke = async (functionName: string) => {
    setInvoking(functionName);
    setInvokeResult(null);
    try {
      const response = await sidecarApi.invokeLambdaFunction(functionName, { test: 'event', source: 'floci-ui-sidecar' });
      logActivity('Lambda', `Invoke: ${functionName}`, 'success', 'sidecar/aws-cli');
      setInvokeResult(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logActivity('Lambda', `Invoke failed: ${functionName}`, 'error', message);
      setInvokeResult({ error: message });
    } finally {
      setInvoking(null);
    }
  };

  const handleDelete = async (functionName: string) => {
    if (!confirm(`Delete function ${functionName}?`)) return;
    setWorkingFunction(functionName);
    try {
      await sidecarApi.deleteLambdaFunction(functionName);
      logActivity('Lambda', `DeleteFunction: ${functionName}`, 'success', 'sidecar/aws-cli');
      fetchFunctions();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logActivity('Lambda', `DeleteFunction failed: ${functionName}`, 'error', message);
      alert(message);
    } finally {
      setWorkingFunction(null);
    }
  };

  const openCodeModal = (fn: LambdaFunctionRecord) => {
    const template = capabilities.templates.find(item => item.runtime === fn.Runtime) || capabilities.templates[0];
    setCodeTarget(fn);
    setUpdateSourceMode(template ? 'inline' : 'zipBase64');
    setUpdateSourceFileName(template?.fileName || 'index.js');
    setUpdateSourceCode(template?.source || '');
    setUpdateZipFile(null);
    setIsCodeModalOpen(true);
  };

  const handleUpdateCode = async () => {
    if (!codeTarget?.FunctionName) return;
    setWorkingFunction(codeTarget.FunctionName);
    try {
      await sidecarApi.updateLambdaCode(codeTarget.FunctionName, {
        runtime: codeTarget.Runtime || runtime,
        code: await buildCodeInput(updateSourceMode, updateSourceFileName, updateSourceCode, updateZipFile),
      });
      logActivity('Lambda', `UpdateFunctionCode: ${codeTarget.FunctionName}`, 'success', 'sidecar/aws-cli');
      setIsCodeModalOpen(false);
      fetchFunctions();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logActivity('Lambda', `UpdateFunctionCode failed: ${codeTarget.FunctionName}`, 'error', message);
      alert(message);
    } finally {
      setWorkingFunction(null);
    }
  };

  const openConfigModal = (fn: LambdaFunctionRecord) => {
    setConfigTarget(fn);
    setConfigDraft({
      runtime: fn.Runtime || 'nodejs18.x',
      handler: fn.Handler || 'index.handler',
      role: fn.Role || capabilities.defaultRoleArn,
      description: fn.Description || '',
      timeout: String(fn.Timeout || 3),
      memorySize: String(fn.MemorySize || 128),
    });
    setIsConfigModalOpen(true);
  };

  const handleUpdateConfig = async () => {
    if (!configTarget?.FunctionName) return;
    setWorkingFunction(configTarget.FunctionName);
    try {
      await sidecarApi.updateLambdaConfiguration(configTarget.FunctionName, {
        runtime: configDraft.runtime,
        handler: configDraft.handler,
        role: configDraft.role,
        description: configDraft.description,
        timeout: parseInt(configDraft.timeout, 10),
        memorySize: parseInt(configDraft.memorySize, 10),
      });
      logActivity('Lambda', `UpdateFunctionConfiguration: ${configTarget.FunctionName}`, 'success', 'sidecar/aws-cli');
      setIsConfigModalOpen(false);
      fetchFunctions();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logActivity('Lambda', `UpdateFunctionConfiguration failed: ${configTarget.FunctionName}`, 'error', message);
      alert(message);
    } finally {
      setWorkingFunction(null);
    }
  };

  const handleFetchLogs = async (functionName: string) => {
    setWorkingFunction(functionName);
    try {
      const response = await sidecarApi.getLambdaLogs(functionName);
      setLogsResult({ functionName, ...response });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setLogsResult({ functionName, error: message });
    } finally {
      setWorkingFunction(null);
    }
  };

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader
        title="Lambda Compute"
        icon={<Zap size={18} />}
        onRefresh={fetchFunctions}
        isRefreshing={loading}
        actions={
          <Button onClick={() => setIsCreationModalOpen(true)} icon={<CirclePlus size={14} />}>
            Create Function
          </Button>
        }
      />

      <CreateLambdaModal
        isOpen={isCreationModalOpen}
        onClose={() => setIsCreationModalOpen(false)}
        capabilities={capabilities}
        functionName={newFuncName}
        setFunctionName={setNewFuncName}
        runtime={runtime}
        setRuntime={handleRuntimeChange}
        handler={handler}
        setHandler={setHandler}
        role={role}
        setRole={setRole}
        description={description}
        setDescription={setDescription}
        memory={memory}
        setMemory={setMemory}
        timeout={timeout}
        setTimeout={setTimeoutVal}
        sourceMode={sourceMode}
        setSourceMode={setSourceMode}
        sourceFileName={sourceFileName}
        setSourceFileName={setSourceFileName}
        sourceCode={sourceCode}
        setSourceCode={setSourceCode}
        zipFile={zipFile}
        setZipFile={setZipFile}
        isCreating={isCreating}
        onCreate={handleCreate}
      />

      <CodeUpdateModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
        targetName={codeTarget?.FunctionName}
        sourceMode={updateSourceMode}
        setSourceMode={setUpdateSourceMode}
        sourceFileName={updateSourceFileName}
        setSourceFileName={setUpdateSourceFileName}
        sourceCode={updateSourceCode}
        setSourceCode={setUpdateSourceCode}
        zipFile={updateZipFile}
        setZipFile={setUpdateZipFile}
        isSaving={workingFunction === codeTarget?.FunctionName}
        onSave={handleUpdateCode}
      />

      <ConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        targetName={configTarget?.FunctionName}
        capabilities={capabilities}
        draft={configDraft}
        setDraft={setConfigDraft}
        isSaving={workingFunction === configTarget?.FunctionName}
        onSave={handleUpdateConfig}
      />

      <div className="p-6 space-y-6 flex-1 overflow-auto bg-brand-bg">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text opacity-30" size={14} />
            <Input placeholder="Filter Functions..." className="pl-10 text-xs" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Card className="py-2 px-3 text-[9px] font-mono flex items-center justify-between">
            <span className="opacity-50">SIDECAR</span>
            <span className="truncate normal-case">{capabilities.endpointUrl}</span>
          </Card>
        </div>

        {invokeResult !== null && (
          <ResultPanel title="Invoke Result" result={invokeResult} onClose={() => setInvokeResult(null)} />
        )}

        {logsResult !== null && (
          <ResultPanel title="Logs" result={logsResult} onClose={() => setLogsResult(null)} />
        )}

        <div className="grid grid-cols-1 gap-4">
          {loading ? (
            [1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)
          ) : error ? (
            <Card className="text-rose-600 font-mono text-[10px] text-center py-10 border-rose-600 bg-rose-50 normal-case">{error}</Card>
          ) : filteredFunctions.length === 0 ? (
            <Card className="text-brand-text opacity-30 text-center py-12 italic text-[10px] uppercase font-bold tracking-widest bg-brand-muted/30 border-dashed">
              No Functions Found
            </Card>
          ) : (
            filteredFunctions.map(fn => (
              <FunctionCard
                key={fn.FunctionArn || fn.FunctionName}
                fn={fn}
                invoking={invoking === fn.FunctionName}
                working={workingFunction === fn.FunctionName}
                onInvoke={() => fn.FunctionName && handleInvoke(fn.FunctionName)}
                onUpdateCode={() => openCodeModal(fn)}
                onConfigure={() => openConfigModal(fn)}
                onLogs={() => fn.FunctionName && handleFetchLogs(fn.FunctionName)}
                onDelete={() => fn.FunctionName && handleDelete(fn.FunctionName)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default LambdaView;
