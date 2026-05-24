import { format } from 'date-fns';
import { Clock, Cpu, FileCode, Play, Settings, ScrollText, Zap } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card } from '../../components/ui-elements';
import type { LambdaFunctionRecord } from './types';

const formatLastModified = (value?: string) => {
  if (!value) return 'unknown';
  try {
    return format(new Date(value), 'yyyy-MM-dd HH:mm');
  } catch {
    return value;
  }
};

const ActionButton = ({ onClick, disabled, icon, label }: { onClick: () => void; disabled?: boolean; icon: ReactNode; label: string }) => (
  <button onClick={onClick} disabled={disabled} className="hover:underline flex items-center gap-1.5 group-hover:text-brand-bg disabled:opacity-50">
    {icon}
    {label}
  </button>
);

interface Props {
  fn: LambdaFunctionRecord;
  invoking: boolean;
  working: boolean;
  onInvoke: () => void;
  onUpdateCode: () => void;
  onConfigure: () => void;
  onLogs: () => void;
  onDelete: () => void;
}

export const FunctionCard = ({ fn, invoking, working, onInvoke, onUpdateCode, onConfigure, onLogs, onDelete }: Props) => (
  <Card className="group hover:bg-brand-text hover:text-white transition-colors">
    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-12 h-12 border border-brand-text flex flex-col items-center justify-center opacity-70 group-hover:border-brand-bg relative shrink-0">
          <Zap size={20} />
          <div className="absolute -bottom-1 -right-1 bg-brand-text text-brand-bg text-[8px] px-1 font-bold group-hover:bg-brand-bg group-hover:text-brand-text">
            {fn.Runtime?.split('.')[0] || 'zip'}
          </div>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-bold text-[12px] font-mono truncate">{fn.FunctionName}</h4>
            <span className="text-[9px] px-1.5 py-0.5 bg-brand-muted text-brand-text rounded-sm uppercase font-bold group-hover:bg-white/20 group-hover:text-white">
              {fn.Runtime}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[10px] opacity-50 font-mono normal-case">
            <span className="flex items-center gap-1"><Clock size={12} /> {fn.Timeout}s</span>
            <span className="flex items-center gap-1"><Cpu size={12} /> {fn.MemorySize}MB</span>
            <span className="flex items-center gap-1"><FileCode size={12} /> {fn.Handler}</span>
            <span className="italic">{formatLastModified(fn.LastModified)}</span>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-widest">
        <ActionButton onClick={onInvoke} disabled={invoking || working} icon={<Play size={12} fill="currentColor" />} label={invoking ? 'Running...' : 'Invoke'} />
        <ActionButton onClick={onUpdateCode} disabled={working} icon={<FileCode size={12} />} label="Code" />
        <ActionButton onClick={onConfigure} disabled={working} icon={<Settings size={12} />} label="Config" />
        <ActionButton onClick={onLogs} disabled={working} icon={<ScrollText size={12} />} label="Logs" />
        <button onClick={onDelete} disabled={working} className="hover:text-rose-500 font-bold group-hover:text-rose-400 disabled:opacity-50">
          Drop
        </button>
      </div>
    </div>
  </Card>
);
