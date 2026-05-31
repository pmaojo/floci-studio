import { useState } from 'react';
import { useAws } from '../contexts/AwsContext';
import {
  Settings as SettingsIcon,
  Save,
  RefreshCw,
  AlertCircle,
  Plus,
  Trash2,
  UserCheck,
  Download,
  Wifi,
  WifiOff,
  KeyRound,
} from 'lucide-react';
import { PageHeader, Card, Button, Input } from '../components/ui-elements';
import { sidecarApi, type AwsCliProfile } from '../lib/sidecarApi';
import type { SavedProfile } from '../types';

const SettingsView = () => {
  const {
    config,
    updateConfig,
    isHealthy,
    wsConnected,
    checkHealth,
    savedProfiles,
    saveProfile,
    deleteProfile,
    applyProfile,
  } = useAws();

  const [formData, setFormData] = useState({ ...config });
  const [newProfileName, setNewProfileName] = useState('');
  const [awsCliProfiles, setAwsCliProfiles] = useState<AwsCliProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [assumeRoleArn, setAssumeRoleArn] = useState('');
  const [assumeRoleLoading, setAssumeRoleLoading] = useState(false);
  const [assumeRoleError, setAssumeRoleError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfig(formData);
  };

  const handleSaveProfile = () => {
    const name = newProfileName.trim();
    if (!name) return;
    saveProfile(name);
    setNewProfileName('');
  };

  const handleApplyProfile = (profile: SavedProfile) => {
    applyProfile(profile);
    setFormData({ ...profile.config });
  };

  const handleDetectAwsProfiles = async () => {
    setLoadingProfiles(true);
    try {
      const res = await sidecarApi.listAwsProfiles();
      setAwsCliProfiles(res.profiles ?? []);
    } catch {
      setAwsCliProfiles([]);
    } finally {
      setLoadingProfiles(false);
    }
  };

  const handleAssumeRole = async () => {
    if (!assumeRoleArn.trim()) return;
    setAssumeRoleLoading(true);
    setAssumeRoleError('');
    try {
      const creds = await sidecarApi.assumeRole(assumeRoleArn.trim(), 'floci-session');
      setFormData(prev => ({
        ...prev,
        accessKeyId: creds.accessKeyId,
        secretAccessKey: creds.secretAccessKey,
        sessionToken: creds.sessionToken,
      }));
      setAssumeRoleArn('');
    } catch (err) {
      setAssumeRoleError(err instanceof Error ? err.message : 'AssumeRole failed');
    } finally {
      setAssumeRoleLoading(false);
    }
  };

  const profileTypeLabel: Record<string, string> = {
    static: 'static keys',
    sso: 'SSO',
    assume_role: 'AssumeRole',
  };

  return (
    <div className="flex flex-col h-full bg-brand-bg">
      <PageHeader title="Configuration Settings" icon={<SettingsIcon size={18} />} />

      <div className="p-8 max-w-4xl mx-auto space-y-8 overflow-auto w-full">

        {/* ── Saved Profiles ─────────────────────────────────────── */}
        <Card noPadding>
          <div className="px-6 py-4 border-b border-brand-text bg-brand-muted flex items-center justify-between">
            <h3 className="font-bold text-[10px] uppercase tracking-widest text-brand-text">Saved Profiles</h3>
            <div className="flex items-center gap-1.5 text-[9px] font-mono text-brand-text opacity-50">
              {wsConnected
                ? <><Wifi size={11} className="text-green-500 opacity-100" /> WS live</>
                : <><WifiOff size={11} /> WS offline</>}
            </div>
          </div>
          <div className="p-6 space-y-4">
            {savedProfiles.length === 0 && (
              <p className="text-[10px] text-brand-text opacity-40 font-mono">No profiles saved yet.</p>
            )}
            {savedProfiles.map(p => (
              <div key={p.name} className="flex items-center gap-3 group">
                <div className="flex-1 font-mono text-[10px]">
                  <span className="font-bold text-brand-text">{p.name}</span>
                  <span className="opacity-40 ml-2">{p.config.endpoint}</span>
                  <span className="opacity-40 ml-2">{p.config.region}</span>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleApplyProfile(p)}
                  icon={<UserCheck size={12} />}
                >
                  Apply
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => deleteProfile(p.name)}
                  icon={<Trash2 size={12} />}
                >
                  Delete
                </Button>
              </div>
            ))}

            <div className="flex gap-2 pt-2 border-t border-brand-text/10">
              <Input
                value={newProfileName}
                onChange={e => setNewProfileName(e.target.value)}
                placeholder="Profile name"
                className="font-mono text-[10px]"
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleSaveProfile())}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleSaveProfile}
                icon={<Plus size={13} />}
              >
                Save current
              </Button>
            </div>
          </div>
        </Card>

        {/* ── AWS CLI Profiles ───────────────────────────────────── */}
        <Card noPadding>
          <div className="px-6 py-4 border-b border-brand-text bg-brand-muted">
            <h3 className="font-bold text-[10px] uppercase tracking-widest text-brand-text">AWS CLI Profiles (~/.aws)</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={handleDetectAwsProfiles}
                icon={<Download size={13} className={loadingProfiles ? 'animate-spin' : ''} />}
              >
                Detect profiles
              </Button>
            </div>
            {awsCliProfiles.length > 0 && (
              <div className="space-y-2">
                {awsCliProfiles.map(p => (
                  <div key={p.name} className="flex items-center gap-3 font-mono text-[10px] py-1">
                    <span className="font-bold text-brand-text w-32 truncate">{p.name}</span>
                    <span className="text-brand-text opacity-40 w-20">{profileTypeLabel[p.type] ?? p.type}</span>
                    {p.region && <span className="text-brand-text opacity-40">{p.region}</span>}
                    {p.roleArn && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setAssumeRoleArn(p.roleArn!)}
                        icon={<KeyRound size={11} />}
                      >
                        Use role
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ── Connection ─────────────────────────────────────────── */}
          <Card noPadding>
            <div className="px-6 py-4 border-b border-brand-text bg-brand-muted">
              <h3 className="font-bold text-[10px] uppercase tracking-widest text-brand-text">Connection Parameters</h3>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-brand-text mb-2 uppercase tracking-widest opacity-60">Endpoint URL</label>
                <div className="flex gap-2">
                  <Input
                    value={formData.endpoint}
                    onChange={e => setFormData({ ...formData, endpoint: e.target.value })}
                    placeholder="http://localhost:4566"
                    className="font-mono"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => checkHealth()}
                    className="whitespace-nowrap"
                    icon={<RefreshCw size={14} className={isHealthy === null ? 'animate-spin' : ''} />}
                  >
                    Detect
                  </Button>
                </div>
                <p className="mt-2 text-[10px] text-brand-text opacity-40 font-medium">Point your AWS SDK at this local Floci address.</p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold text-brand-text mb-2 uppercase tracking-widest opacity-60">Target Region</label>
                  <Input
                    value={formData.region}
                    onChange={e => setFormData({ ...formData, region: e.target.value })}
                    placeholder="us-east-1"
                    className="font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-brand-text mb-2 uppercase tracking-widest opacity-60">Account ID</label>
                  <Input placeholder="000000000000" disabled value="000000000000" className="font-mono bg-brand-muted/30" />
                </div>
              </div>

              <div className="p-4 bg-amber-50 border border-brand-text border-dashed flex gap-3 text-amber-900 font-mono text-[10px]">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold mb-1">CORS_HEADER_MISSING</p>
                  <p className="opacity-80">Ensure Floci is configured to allow requests from {window.location.origin} to avoid cross-origin blocks.</p>
                </div>
              </div>
            </div>
          </Card>

          {/* ── Authentication ─────────────────────────────────────── */}
          <Card noPadding>
            <div className="px-6 py-4 border-b border-brand-text bg-brand-muted">
              <h3 className="font-bold text-[10px] uppercase tracking-widest text-brand-text">Authentication Keys</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-brand-text mb-2 uppercase tracking-widest opacity-60">AWS_ACCESS_KEY_ID</label>
                <Input
                  value={formData.accessKeyId}
                  onChange={e => setFormData({ ...formData, accessKeyId: e.target.value })}
                  placeholder="test"
                  className="font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-brand-text mb-2 uppercase tracking-widest opacity-60">AWS_SECRET_ACCESS_KEY</label>
                <Input
                  type="password"
                  value={formData.secretAccessKey}
                  onChange={e => setFormData({ ...formData, secretAccessKey: e.target.value })}
                  placeholder="test"
                  className="font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-brand-text mb-2 uppercase tracking-widest opacity-60">
                  AWS_SESSION_TOKEN <span className="opacity-50 normal-case tracking-normal">(optional — for temporary credentials)</span>
                </label>
                <Input
                  type="password"
                  value={formData.sessionToken ?? ''}
                  onChange={e => setFormData({ ...formData, sessionToken: e.target.value || undefined })}
                  placeholder="leave empty if not using temporary credentials"
                  className="font-mono"
                />
              </div>

              {/* AssumeRole inline */}
              <div className="pt-2 border-t border-brand-text/10 space-y-2">
                <label className="block text-[10px] font-bold text-brand-text mb-2 uppercase tracking-widest opacity-60">Assume Role ARN</label>
                <div className="flex gap-2">
                  <Input
                    value={assumeRoleArn}
                    onChange={e => setAssumeRoleArn(e.target.value)}
                    placeholder="arn:aws:iam::123456789012:role/MyRole"
                    className="font-mono"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleAssumeRole}
                    className="whitespace-nowrap"
                    icon={<KeyRound size={13} className={assumeRoleLoading ? 'animate-spin' : ''} />}
                  >
                    Assume
                  </Button>
                </div>
                {assumeRoleError && (
                  <p className="text-[10px] text-red-600 font-mono">{assumeRoleError}</p>
                )}
                <p className="text-[10px] text-brand-text opacity-40 font-medium">
                  Calls STS AssumeRole and injects temporary credentials above.
                </p>
              </div>
            </div>
          </Card>

          <div className="flex justify-end pt-4">
            <Button type="submit" size="lg" icon={<Save size={16} />}>
              Save and Reconnect
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsView;
