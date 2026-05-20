import React, { useState, useEffect } from 'react';
import { RefreshCw, CirclePlus, Trash2, Eye, ShieldAlert, FileText, Check, Search, Calendar } from 'lucide-react';
import { PageHeader, Card, Button, Input, Modal, Select } from '../components/ui-elements';
import { useAws } from '../contexts/AwsContext';

interface Trail {
  id: string;
  name: string;
  s3BucketName: string;
  multiRegion: boolean;
  status: 'logging' | 'stopped';
}

interface AuditEvent {
  id: string;
  time: string;
  username: string;
  eventSource: string;
  eventName: string;
  resourceName: string;
}

const CloudTrailView = () => {
  const { logActivity, activity } = useAws();
  const [trails, setTrails] = useState<Trail[]>(() => {
    const saved = localStorage.getItem('aws-sim-cloudtrail-trails');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback below
      }
    }
    return [
      {
        id: "trail-prd",
        name: "organization-audit-trail-global",
        s3BucketName: "aws-cloudtrail-logs-organization-global",
        multiRegion: true,
        status: "logging"
      }
    ];
  });

  React.useEffect(() => {
    localStorage.setItem('aws-sim-cloudtrail-trails', JSON.stringify(trails));
  }, [trails]);

  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [s3Bucket, setS3Bucket] = useState('');
  const [multiRegion, setMultiRegion] = useState(true);

  // Generate some premium realistic audit events
  const [staticEvents] = useState<AuditEvent[]>([
    { id: "tx-da1e", time: "3 mins ago", username: "admin-root", eventSource: "iam.amazonaws.com", eventName: "CreateAccessKey", resourceName: "developer-key-pair" },
    { id: "tx-f10a", time: "5 mins ago", username: "floci-daemon", eventSource: "sts.amazonaws.com", eventName: "AssumeRole", resourceName: "FlociLambdaExecutionRole" },
    { id: "tx-9c2b", time: "8 mins ago", username: "billing-manager", eventSource: "s3.amazonaws.com", eventName: "PutBucketPolicy", resourceName: "floci-billing-invoice-s3" },
    { id: "tx-ee31", time: "11 mins ago", username: "dev-pelayo", eventSource: "ec2.amazonaws.com", eventName: "RunInstances", resourceName: "keycloak-web-host" },
    { id: "tx-a6b1", time: "15 mins ago", username: "admin-root", eventSource: "rds.amazonaws.com", eventName: "CreateDBInstance", resourceName: "keycloak-database" }
  ]);

  // Merge the static simulated events with the real-time activity context log
  const events = React.useMemo(() => {
    const actEvents: AuditEvent[] = activity.map(act => {
      const timeStr = act.timestamp ? new Date(act.timestamp).toLocaleTimeString() : 'Just now';
      return {
        id: act.id,
        time: `${timeStr} (${act.status.toUpperCase()})`,
        username: "floci-console",
        eventSource: `${act.service.toLowerCase()}.amazonaws.com`,
        eventName: act.action,
        resourceName: act.details || "Request"
      };
    });
    return [...actEvents, ...staticEvents];
  }, [activity, staticEvents]);

  const fetchTrails = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      logActivity('CloudTrail', 'DescribeTrails', 'success');
    }, 500);
  };

  const handleCreate = () => {
    if (!newName) return;
    const cleanId = newName.toLowerCase().replace(/[^a-z0-9-_]/g, '');
    const newTrail: Trail = {
      id: `trail-${Math.random().toString(36).substring(5)}`,
      name: cleanId,
      s3BucketName: s3Bucket || `aws-cloudtrail-logs-${cleanId}`,
      multiRegion,
      status: 'logging'
    };

    setTrails(prev => [...prev, newTrail]);
    logActivity('CloudTrail', `CreateTrail: ${cleanId}`, 'success');
    setIsModalOpen(false);
    setNewName('');
    setS3Bucket('');
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete Trail ${name}?`)) return;
    setTrails(prev => prev.filter(t => t.id !== id));
    logActivity('CloudTrail', `DeleteTrail: ${name}`, 'success');
  };

  const handleToggleStatus = (id: string, name: string, currentStatus: 'logging' | 'stopped') => {
    const nextStatus = currentStatus === 'logging' ? 'stopped' : 'logging';
    setTrails(prev => prev.map(t => t.id === id ? { ...t, status: nextStatus } : t));
    logActivity('CloudTrail', `${nextStatus === 'logging' ? 'Start' : 'Stop'}Logging: ${name}`, 'success');
  };

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader
        title="CloudTrail Auditing"
        icon={<FileText size={18} />}
        onRefresh={fetchTrails}
        isRefreshing={loading}
        actions={
          <Button onClick={() => setIsModalOpen(true)} icon={<CirclePlus size={14} />}>
            Create Trail
          </Button>
        }
      />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create CloudTrail Trail">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Trail Name</label>
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="global-compliance-audit-v2"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">S3 Storage Bucket for Trail Storage Logs</label>
            <Input
              value={s3Bucket}
              onChange={e => setS3Bucket(e.target.value)}
              placeholder="aws-cloudtrail-logs-compliance"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Multi-Region Trail Support</label>
            <Select value={multiRegion ? "yes" : "no"} onChange={e => setMultiRegion(e.target.value === "yes")}>
              <option value="yes">Yes, apply audit trail globally</option>
              <option value="no">No, trail single-region variables only</option>
            </Select>
          </div>

          <div className="pt-4 flex gap-3">
             <Button variant="ghost" className="flex-1" onClick={() => setIsModalOpen(false)}>Cancel</Button>
             <Button className="flex-1" onClick={handleCreate} disabled={!newName}>
               Create Logging Trail
             </Button>
          </div>
        </div>
      </Modal>

      <div className="p-6 space-y-6 flex-1 overflow-auto bg-brand-bg">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Active Logging Trails */}
          <div className="xl:col-span-1 space-y-6">
            <div className="border border-brand-text/15 bg-white p-4 rounded-sm">
              <h3 className="font-bold text-xs pb-3 border-b border-brand-text/10 mb-4 tracking-wider">ACTIVE_AUDIT_TRAILS</h3>
              <div className="space-y-4">
                {trails.map(t => (
                  <div key={t.id} className="border border-brand-text/5 bg-brand-muted/10 p-3 relative hover:border-brand-text/50 rounded-sm">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-mono font-bold text-[10px] block truncate max-w-[180px]">{t.name}</span>
                      <button onClick={() => handleDelete(t.id, t.name)} className="p-0.5 text-zinc-400 hover:text-rose-600">
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <p className="text-[9px] font-mono opacity-50 truncate">S3: {t.s3BucketName}</p>

                    <div className="mt-4 pt-2 border-t border-brand-text/5 flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${t.status === 'logging' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                        <span className="text-[8px] font-mono opacity-50 uppercase">{t.status.toUpperCase()}</span>
                      </div>
                      <Button
                        size="xs"
                        variant="ghost"
                        className="text-[8px] border shrink-0 scale-90 px-1.5"
                        onClick={() => handleToggleStatus(t.id, t.name, t.status)}
                      >
                        {t.status === 'logging' ? 'STOP_LOG' : 'START_LOG'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Audit Log Stream */}
          <div className="xl:col-span-2 space-y-4">
            <div className="border border-brand-text/15 bg-white p-4 rounded-sm flex-1">
              <div className="flex justify-between items-center pb-3 border-b border-brand-text/10 mb-4">
                <h3 className="font-bold text-xs tracking-wider flex items-center gap-2"><Eye size={13} /> EVENT_LOG_AUDITING_STREAM</h3>
                <span className="text-[8px] font-mono opacity-40">AUTO_UPDATES_ON</span>
              </div>

              <div className="space-y-2 max-h-[420px] overflow-auto pr-2 scrollbar-hide">
                {events.map((evt, i) => (
                  <div key={i} className="flex justify-between items-center text-[10px] border border-brand-text/5 hover:border-brand-text/20 p-2 bg-brand-muted/15 font-mono">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                      <div className="text-left">
                        <span className="font-bold text-brand-text uppercase block">{evt.eventName}</span>
                        <span className="text-[8px] text-zinc-400 lowercase block">Source: {evt.eventSource} | Resource: {evt.resourceName}</span>
                      </div>
                    </div>
                    <div className="text-right flex flex-col shrink-0">
                      <span className="font-bold text-zinc-600 block">{evt.username}</span>
                      <span className="text-[8px] text-zinc-400 lowercase block">{evt.time}</span>
                    </div>
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

export default CloudTrailView;
