import { useMemo, useState, useEffect } from 'react';
import type { AliasListEntry } from '@aws-sdk/client-kms';
import {
  CreateAliasCommand,
  CreateKeyCommand,
  DeleteAliasCommand,
  ListAliasesCommand,
  ListKeysCommand,
  ScheduleKeyDeletionCommand,
} from '@aws-sdk/client-kms';
import { useAws } from '../contexts/AwsContext';
import { Key, Search, CirclePlus, Trash2, Shield, Fingerprint, Stethoscope, X } from 'lucide-react';
import { PageHeader, Card, Button, Input, Skeleton } from '../components/ui-elements';
import { sidecarApi, type KmsRoundTripResult } from '../lib/sidecarApi';

const AMADEUS_KMS_ALIAS = 'alias/amadeus-local-key';

const KMSView = () => {
  const { clients, logActivity } = useAws();
  const [keys, setKeys] = useState<any[]>([]);
  const [aliases, setAliases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [diagnostic, setDiagnostic] = useState<KmsRoundTripResult | null>(null);
  const [diagnosticRunning, setDiagnosticRunning] = useState(false);

  const fetchKeys = async () => {
    setLoading(true);
    setError(null);
    try {
      const [keysResponse, aliasesResponse] = await Promise.all([
        clients.kms.send(new ListKeysCommand({})),
        clients.kms.send(new ListAliasesCommand({})),
      ]);
      setKeys(keysResponse.Keys || []);
      setAliases(aliasesResponse.Aliases || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err) || 'Failed to fetch KMS keys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleCreateKey = async () => {
    try {
      await clients.kms.send(new CreateKeyCommand({
        Description: 'Key created via Floci Manager',
        Tags: [{ TagKey: 'CreatedBy', TagValue: 'FlociManager' }]
      }));
      logActivity('KMS', 'CreateKey', 'success');
      fetchKeys();
    } catch (err: unknown) {
      logActivity('KMS', 'CreateKey failed', 'error', err instanceof Error ? err.message : String(err));
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  const handleEnsureAmadeusKey = async () => {
    try {
      const currentAliases = await clients.kms.send(new ListAliasesCommand({}));
      const existingAlias = currentAliases.Aliases?.find(alias => alias.AliasName === AMADEUS_KMS_ALIAS);
      if (existingAlias?.TargetKeyId) {
        logActivity('KMS', 'AliasAlreadyExists', 'success', AMADEUS_KMS_ALIAS);
        fetchKeys();
        return;
      }

      const key = await clients.kms.send(new CreateKeyCommand({
        Description: 'Amadeus Local Key',
        Tags: [
          { TagKey: 'CreatedBy', TagValue: 'FlociManager' },
          { TagKey: 'Purpose', TagValue: 'AmadeusLocalCredentials' },
        ],
      }));

      const keyId = key.KeyMetadata?.KeyId;
      if (!keyId) throw new Error('KMS did not return a KeyId');

      await clients.kms.send(new CreateAliasCommand({
        AliasName: AMADEUS_KMS_ALIAS,
        TargetKeyId: keyId,
      }));

      logActivity('KMS', 'CreateAmadeusAlias', 'success', AMADEUS_KMS_ALIAS);
      fetchKeys();
    } catch (err: unknown) {
      logActivity('KMS', 'CreateAmadeusAlias failed', 'error', err instanceof Error ? err.message : String(err));
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  const handleScheduleDeletion = async (keyId: string) => {
    if (!keyId || !confirm(`Schedule deletion for KMS key ${keyId}?`)) return;
    try {
      await clients.kms.send(new ScheduleKeyDeletionCommand({
        KeyId: keyId,
        PendingWindowInDays: 7,
      }));
      logActivity('KMS', 'ScheduleKeyDeletion', 'success', keyId);
      fetchKeys();
    } catch (err: unknown) {
      logActivity('KMS', 'ScheduleKeyDeletion failed', 'error', err instanceof Error ? err.message : String(err));
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDeleteAlias = async (aliasName: string) => {
    if (!aliasName || !confirm(`Delete KMS alias ${aliasName}?`)) return;
    try {
      await clients.kms.send(new DeleteAliasCommand({ AliasName: aliasName }));
      logActivity('KMS', 'DeleteAlias', 'success', aliasName);
      fetchKeys();
    } catch (err: unknown) {
      logActivity('KMS', 'DeleteAlias failed', 'error', err instanceof Error ? err.message : String(err));
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDiagnose = async () => {
    setDiagnosticRunning(true);
    setDiagnostic(null);
    try {
      const result = await sidecarApi.runKmsDiagnostic();
      setDiagnostic(result);
      logActivity(
        'KMS',
        result.ok ? 'Diagnostic OK' : 'Diagnostic FAILED',
        result.ok ? 'success' : 'error',
        result.matches ? `keyId=${result.keyId}` : 'round-trip mismatch',
      );
      // Refresh listings to surface the transient diagnostic key + any cleanup state.
      fetchKeys();
    } catch (err: unknown) {
      logActivity('KMS', 'Diagnostic unreachable', 'error', err instanceof Error ? err.message : String(err));
      setDiagnostic({
        ok: false,
        matches: false,
        plaintext: '',
        steps: [{ name: 'sidecar', ok: false, durationMs: 0, error: err instanceof Error ? err.message : String(err) }],
        cleanup: { ok: true },
      });
    } finally {
      setDiagnosticRunning(false);
    }
  };

  const aliasesByKeyId = useMemo(() => {
    return aliases.reduce<Map<string, AliasListEntry[]>>((grouped, alias) => {
      if (!alias.TargetKeyId) return grouped;
      const currentAliases = grouped.get(alias.TargetKeyId) || [];
      currentAliases.push(alias);
      grouped.set(alias.TargetKeyId, currentAliases);
      return grouped;
    }, new Map<string, AliasListEntry[]>());
  }, [aliases]);

  const filteredKeys = keys.filter(key => {
    const keyAliases = aliasesByKeyId.get(key.KeyId) || [];
    const searchableText = [
      key.KeyId,
      key.KeyArn,
      ...keyAliases.map((alias: AliasListEntry) => alias.AliasName),
    ].join(' ').toLowerCase();

    return searchableText.includes(search.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader 
        title="KMS / Cryptography" 
        icon={<Fingerprint size={18} />}
        onRefresh={fetchKeys}
        isRefreshing={loading}
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={handleDiagnose} variant="secondary" icon={<Stethoscope size={14} />} disabled={diagnosticRunning}>
              {diagnosticRunning ? 'Running...' : 'Diagnose'}
            </Button>
            <Button onClick={handleEnsureAmadeusKey} variant="secondary" icon={<Shield size={14} />}>
              Amadeus Alias
            </Button>
            <Button onClick={handleCreateKey} icon={<CirclePlus size={14} />}>
              Generate Key
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-6 flex-1 overflow-auto bg-brand-bg">
        {error && (
          <Card className="text-rose-600 font-mono text-[10px] bg-rose-50 border-rose-600 normal-case">
            {error}
          </Card>
        )}

        {diagnostic && (
          <DiagnosticPanel result={diagnostic} onClose={() => setDiagnostic(null)} />
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text opacity-30" size={14} />
          <Input 
            placeholder="Filter Keys..." 
            className="pl-10 font-mono text-[11px]" 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            [1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)
          ) : filteredKeys.length === 0 ? (
            <div className="col-span-full py-20 text-center border-dashed border-brand-text/30 border bg-brand-muted/10">
               <p className="text-[10px] font-bold opacity-30 tracking-widest">NO_KEYS_AVAILABLE</p>
            </div>
          ) : (
            filteredKeys.map(key => {
              const keyAliases = aliasesByKeyId.get(key.KeyId) || [];
              return (
              <Card key={key.KeyId} className="hover:bg-brand-text hover:text-white transition-colors group cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 border border-brand-text flex items-center justify-center opacity-40 group-hover:border-brand-bg group-hover:opacity-100">
                    <Key size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-bold opacity-40 mb-1">KEY_ID</p>
                    <p className="text-[11px] font-mono font-bold truncate">{key.KeyId}</p>
                    <p className="text-[10px] mt-2 opacity-50 truncate lowercase">{key.KeyArn}</p>
                    {keyAliases.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {keyAliases.map((alias: AliasListEntry) => (
                          <button
                            key={alias.AliasName}
                            className="border border-current px-2 py-1 text-[9px] font-bold lowercase inline-flex items-center gap-1"
                            onClick={event => {
                              event.stopPropagation();
                              if (alias.AliasName) handleDeleteAlias(alias.AliasName);
                            }}
                          >
                            <Shield size={10} />
                            {alias.AliasName}
                          </button>
                        ))}
                      </div>
                    )}
                    <button
                      className="mt-4 inline-flex items-center gap-1 text-[9px] font-bold text-rose-700 group-hover:text-rose-200"
                      onClick={event => {
                        event.stopPropagation();
                        handleScheduleDeletion(key.KeyId);
                      }}
                    >
                      <Trash2 size={12} />
                      SCHEDULE DELETION
                    </button>
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

const DiagnosticPanel = ({ result, onClose }: { result: KmsRoundTripResult; onClose: () => void }) => {
  const headerTone = result.ok ? 'bg-emerald-50 border-emerald-600 text-emerald-800' : 'bg-rose-50 border-rose-600 text-rose-700';
  const headerLabel = result.ok ? 'KMS_ROUND_TRIP: PASS' : 'KMS_ROUND_TRIP: FAIL';

  return (
    <Card noPadding className={`border ${headerTone}`}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-current/30 font-bold text-[10px] uppercase tracking-widest">
        <span>{headerLabel}</span>
        <button onClick={onClose} className="p-1 hover:opacity-70" aria-label="Close">
          <X size={14} />
        </button>
      </div>
      <div className="px-4 py-3 text-[10px] font-mono normal-case space-y-1">
        {result.plaintext && (
          <div className="opacity-70">payload: <span className="font-bold">{result.plaintext}</span></div>
        )}
        {result.keyId && (
          <div className="opacity-70">keyId: <span className="font-bold">{result.keyId}</span></div>
        )}
        {result.decrypted !== undefined && (
          <div className="opacity-70">
            decoded: <span className="font-bold">{result.decrypted}</span>
            <span className={`ml-2 ${result.matches ? 'text-emerald-700' : 'text-rose-700'}`}>matches={String(result.matches)}</span>
          </div>
        )}
        <div className="mt-2 grid grid-cols-1 gap-1">
          {result.steps.map(step => (
            <div key={step.name} className="flex flex-wrap items-center gap-2">
              <span className={`px-1 font-bold text-[9px] uppercase ${step.ok ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'}`}>
                {step.ok ? 'pass' : 'fail'}
              </span>
              <span className="font-bold">{step.name}</span>
              <span className="opacity-50">{step.durationMs}ms</span>
              {step.detail && <span className="opacity-60">{step.detail}</span>}
              {step.error && <span className="text-rose-700">{step.error}</span>}
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className={`px-1 font-bold text-[9px] uppercase ${result.cleanup.ok ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'}`}>
              {result.cleanup.ok ? 'pass' : 'warn'}
            </span>
            <span className="font-bold">cleanup</span>
            {result.cleanup.error && <span className="text-rose-700">{result.cleanup.error}</span>}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default KMSView;
