import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useAws } from '../contexts/AwsContext';
import { GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import type { GetCallerIdentityCommandOutput } from '@aws-sdk/client-sts';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { sidecarApi, type AwsServiceSummary } from '../lib/sidecarApi';
import CapabilityMatrix from '../components/CapabilityMatrix';
import {
  Activity,
  Cpu,
  ShieldCheck,
  ExternalLink,
  TrendingUp,
  Box,
  CheckCircle2,
  AlertCircle,
  Fingerprint,
  Archive,
  Terminal,
  Database,
} from 'lucide-react';
import { format } from 'date-fns';
import { Card, Skeleton } from '../components/ui-elements';

const IdentityCard = () => {
  const { clients, isHealthy, logActivity } = useAws();
  const [identity, setIdentity] = useState<GetCallerIdentityCommandOutput | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIdentity = async () => {
      if (!isHealthy) {
        setLoading(false);
        return;
      }
      try {
        const response = await clients.sts.send(new GetCallerIdentityCommand({}));
        setIdentity(response);
        logActivity('STS', 'GetCallerIdentity', 'success', `AccountID: ${response.Account}`);
      } catch (err) {
        logActivity('STS', 'GetCallerIdentity failed', 'error', err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };
    fetchIdentity();
  }, [clients, isHealthy]);

  if (loading) return <Skeleton className="h-32" />;

  return (
    <div className="bg-brand-bg border border-brand-text p-6 relative overflow-hidden group">
      <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
        <Fingerprint size={120} />
      </div>
      <h3 className="font-bold text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2">
        <ShieldCheck size={14} />
        STS_CALLER_IDENTITY
      </h3>
      {isHealthy && identity ? (
        <div className="space-y-3 relative z-10">
          <div>
            <p className="text-[9px] uppercase font-bold opacity-40">Account_ID</p>
            <p className="text-xs font-mono font-bold leading-tight">{identity.Account}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase font-bold opacity-40">User_ARN</p>
            <p className="text-[10px] font-mono leading-tight break-all">{identity.Arn}</p>
          </div>
        </div>
      ) : (
        <div className="text-[10px] font-mono italic opacity-40">
          {isHealthy ? 'Identity lookup unavailable' : 'Waiting for connection...'}
        </div>
      )}
    </div>
  );
};

const Dashboard = () => {
  const { config, isHealthy, activity } = useAws();
  const { s3, dynamo, lambda, codeartifact, loading: statsLoading } = useDashboardStats();
  const [serviceCatalog, setServiceCatalog] = useState<AwsServiceSummary[]>([]);
  const [activeTab, setActiveTab] = useState<'system' | 'matrix'>('system');

  useEffect(() => {
    const fetchServiceCatalog = async () => {
      try {
        const response = await sidecarApi.listAwsServices();
        setServiceCatalog(response.services);
      } catch {
        setServiceCatalog([]);
      }
    };

    fetchServiceCatalog();
  }, []);

  const mainStats = [
    { label: 'S3 Buckets', value: s3, icon: Box },
    { label: 'Lambda Funcs', value: lambda, icon: Terminal },
    { label: 'DynamoDB Tables', value: dynamo, icon: Database },
    { label: 'CodeArtifact Repos', value: codeartifact, icon: Archive },
  ];

  const checklistItems = [
    { label: 'STS Connectivity', status: isHealthy ? 'pass' : 'fail' },
    { label: 'Lambda Runtime', status: isHealthy ? 'pass' : 'fail' },
    { label: 'S3 API Engine', status: isHealthy ? 'pass' : 'fail' },
    { label: 'DynamoDB Storage', status: isHealthy ? 'pass' : 'fail' },
    { label: 'IAM Policy Engine', status: isHealthy ? 'pass' : 'fail' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full"
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 border-b border-brand-text">
        {mainStats.map((stat) => (
          <div key={stat.label} className="p-4 lg:p-6 border-r border-brand-text last:border-r-0 lg:last:border-r-0 even:border-r-0 lg:even:border-r bg-white group hover:bg-brand-muted transition-colors">
            <span className="text-[9px] lg:text-[10px] uppercase font-bold opacity-50 mb-1 block tracking-widest leading-none truncate">{stat.label}</span>
            <div className="flex items-end gap-2">
              <span className="text-2xl lg:text-3xl font-mono tracking-tighter leading-none">
                {statsLoading ? '...' : stat.value}
              </span>
              <stat.icon size={12} className="mb-0.5 lg:mb-1 opacity-20 group-hover:opacity-60 transition-opacity hidden sm:block" />
            </div>
          </div>
        ))}
      </div>

      {/* Tab Navigation Headers */}
      <div className="border-b border-brand-text flex shrink-0 bg-brand-muted font-mono text-[9px]">
        <button
          onClick={() => setActiveTab('system')}
          className={`px-6 py-3 font-bold tracking-widest uppercase transition-all border-r border-brand-text/20 cursor-pointer ${
            activeTab === 'system'
              ? 'bg-brand-bg border-b-2 border-b-brand-text'
              : 'opacity-50 hover:opacity-80 hover:bg-white/20'
          }`}
        >
          System Overview
        </button>
        <button
          onClick={() => setActiveTab('matrix')}
          className={`px-6 py-3 font-bold tracking-widest uppercase transition-all border-r border-brand-text/20 cursor-pointer ${
            activeTab === 'matrix'
              ? 'bg-brand-bg border-b-2 border-b-brand-text'
              : 'opacity-50 hover:opacity-80 hover:bg-white/20'
          }`}
        >
          AWS Capability Matrix
        </button>
      </div>

      {activeTab === 'system' ? (
        <div className="p-4 lg:p-8 space-y-8 flex-1 overflow-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            <div className="lg:col-span-2 space-y-6 lg:space-y-8">
              <Card noPadding>
                <div className="px-5 py-4 border-b border-brand-text bg-brand-muted flex items-center justify-between">
                  <h3 className="font-bold text-brand-text text-xs uppercase tracking-widest">System Overview</h3>
                  <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold text-emerald-700">
                    <TrendingUp size={12} />
                    LIVE CATALOG
                  </div>
                </div>
                
                <div className="p-5 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-brand-muted/30 border border-brand-text gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 bg-white border border-brand-text flex items-center justify-center shrink-0">
                        <Cpu size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[11px] uppercase opacity-60 tracking-tight">Endpoint URL</p>
                        <p className="text-xs font-mono font-bold truncate">{config.endpoint}</p>
                      </div>
                    </div>
                    <a 
                      href={config.endpoint} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-1.5 border border-brand-text hover:bg-white inline-flex items-center justify-center self-end sm:self-auto"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest mb-2 px-1">Access Key</p>
                      <div className="font-mono text-[11px] bg-brand-muted/30 p-3 border border-brand-text border-dashed truncate">
                        {config.accessKeyId}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest mb-2 px-1">Secret Key</p>
                      <div className="font-mono text-[11px] bg-brand-muted/30 p-3 border border-brand-text border-dashed">
                        ••••••••••••••••
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <IdentityCard />
                <div className="p-5 border border-brand-text bg-white">
                  <h3 className="font-bold text-[11px] uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Activity size={14} />
                    VALIDATION_MATRIX
                  </h3>
                  <div className="space-y-2">
                    {checklistItems.map(item => (
                      <div key={item.label} className="flex items-center justify-between text-[10px] uppercase font-bold">
                        <span className="opacity-50">{item.label}</span>
                        <div className="flex items-center gap-1.5 font-mono">
                          {item.status === 'pass' ? <CheckCircle2 size={10} className="text-emerald-600" /> : <AlertCircle size={10} className="text-rose-600" />}
                          <span className={item.status === 'pass' ? 'text-emerald-700' : 'text-rose-700'}>{item.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <Card noPadding>
                <div className="px-6 py-4 border-b border-brand-text bg-black text-brand-green flex items-center justify-between">
                  <h3 className="font-bold text-[10px] uppercase tracking-widest flex items-center gap-2">
                    <Activity size={14} className="animate-pulse" />
                    EVENT_STREAM
                  </h3>
                  <span className="text-[9px] opacity-50">LIVE</span>
                </div>
                <div className="bg-black divide-y divide-brand-green/10 max-h-[400px] overflow-auto">
                  {activity.length === 0 ? (
                    <div className="px-6 py-12 text-center opacity-30 italic text-[10px] font-mono text-brand-green uppercase">
                      No active telemetry
                    </div>
                  ) : (
                    activity.slice(0, 8).map(event => (
                      <div key={event.id} className="px-6 py-3 hover:bg-brand-green/5 transition-colors">
                         <div className="flex items-center gap-2 mb-1">
                            <span className="text-[9px] font-bold text-black bg-brand-green px-1 uppercase leading-tight">
                              {event.service}
                            </span>
                            <span className="text-[10px] font-mono text-brand-green opacity-80 truncate">{event.action}</span>
                         </div>
                         <div className="flex justify-between items-center opacity-40 text-[8px] font-mono">
                            <span>{format(event.timestamp, 'HH:mm:ss')}</span>
                            <span className={event.status === 'success' ? 'text-brand-green' : 'text-rose-500'}>
                              {event.status.toUpperCase()}
                            </span>
                         </div>
                      </div>
                    ))
                  )}
                </div>
                {activity.length > 0 && (
                  <div className="p-3 border-t border-brand-green/20 bg-black text-center">
                     <a href="/events" className="text-[9px] font-bold text-brand-green uppercase hover:underline text-center block">View Full Stream</a>
                  </div>
                )}
              </Card>

              <Card className="p-6 bg-brand-console text-brand-green border-brand-green/20">
                 <h4 className="text-[10px] uppercase font-bold tracking-widest mb-3 opacity-60">Connected Services</h4>
                 <div className="flex flex-wrap gap-2 text-[9px] font-mono">
                   {serviceCatalog.slice(0, 18).map(service => (
                     <span key={service.key} className="px-2 py-0.5 border border-brand-green/30 rounded-full lowercase tracking-tighter">[{service.serviceName}]</span>
                   ))}
                   {serviceCatalog.length > 18 && <span className="opacity-40">+{serviceCatalog.length - 18} more</span>}
                 </div>
              </Card>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 lg:p-8 space-y-8 flex-1 overflow-auto bg-brand-bg">
          <CapabilityMatrix />
        </div>
      )}
    </motion.div>
  );
};

export default Dashboard;
