import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useAws } from '../contexts/AwsContext';
import { Settings as SettingsIcon, Save, RefreshCw, AlertCircle } from 'lucide-react';
import { PageHeader, Card, Button, Input } from '../components/ui-elements';

const SettingsView = () => {
  const { config, updateConfig, isHealthy, checkHealth } = useAws();
  const [formData, setFormData] = useState(config);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfig(formData);
  };

  return (
    <div className="flex flex-col h-full bg-brand-bg">
      <PageHeader 
        title="Configuration Settings" 
        icon={<SettingsIcon size={18} />}
      />

      <div className="p-8 max-w-4xl mx-auto space-y-8 overflow-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
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
                      icon={<RefreshCw size={14} className={isHealthy === null ? "animate-spin" : ""} />}
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
                   <Input 
                      placeholder="000000000000"
                      disabled
                      value="000000000000"
                      className="font-mono bg-brand-muted/30"
                   />
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
