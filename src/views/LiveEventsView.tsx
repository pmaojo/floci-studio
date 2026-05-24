import React from 'react';
import { useAws } from '../contexts/AwsContext';
import { Activity, Search } from 'lucide-react';
import { PageHeader } from '../components/ui-elements';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

const LiveEventsView = () => {
  const { activity } = useAws();
  const [filter, setFilter] = React.useState('');
  const sessionStartedAt = React.useRef(Date.now());
  const [now, setNow] = React.useState(Date.now());

  React.useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const filteredLogs = activity.filter(log => 
    log.service.toLowerCase().includes(filter.toLowerCase()) ||
    log.action.toLowerCase().includes(filter.toLowerCase())
  );
  const recentErrors = activity.filter(log => log.status === 'error').length;
  const sessionUptime = formatDuration(now - sessionStartedAt.current);

  return (
    <div className="flex flex-col h-full uppercase bg-black text-brand-green selection:bg-brand-green selection:text-black font-mono">
      <PageHeader 
        title="Live Events Stream" 
        icon={<Activity size={18} className="animate-pulse" />}
        actions={<div className="text-[10px] font-mono animate-pulse">STREAMING_REALTIME</div>}
      />

      <div className="p-4 bg-zinc-900 border-b border-brand-green/20 text-[10px] flex gap-6">
        <span className="flex items-center gap-2">
          <span className="opacity-40">AUTO_FLUSH:</span>
          <span>ON</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="opacity-40">FILTER:</span>
          <span>[{filter ? filter.toUpperCase() : 'ALL'}]</span>
        </span>
      </div>

      <div className="p-6 flex-1 overflow-auto bg-black">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-green opacity-30" size={12} />
          <input 
            placeholder="FILTER_LOGS..." 
            className="w-full bg-transparent border-b border-brand-green/20 p-2 pl-10 text-[11px] focus:outline-none focus:border-brand-green/100 transition-colors uppercase placeholder:opacity-20" 
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
        </div>

        <div className="space-y-0.5 whitespace-pre font-mono">
          <AnimatePresence initial={false}>
            {filteredLogs.map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-[11px] hover:bg-brand-green/5 flex gap-2 items-baseline py-0.5 border-l-2 border-transparent hover:border-brand-green transition-colors"
              >
                <span className="opacity-30">[{format(log.timestamp, 'HH:mm:ss.SSS')}]</span>
                <span className="font-bold">{log.service}.{log.action}</span>
                {log.details && (
                  <span className="opacity-60 lowercase truncate max-w-[50%]">{log.details}</span>
                )}
                <span className="ml-auto opacity-40">
                  {log.status === 'success' ? '200 OK' : '500 ERR'}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredLogs.length === 0 && (
            <div className="py-20 text-center opacity-20 italic text-[10px] tracking-widest">
              WAITING_FOR_TRAFFIC...
            </div>
          )}
        </div>
      </div>

      <div className="bg-zinc-900 border-t border-brand-green/20 p-4 flex justify-between items-center text-[9px] font-bold tracking-tighter">
         <div className="flex gap-4">
            <span>UPTIME: {sessionUptime}</span>
            <span>EVENTS: {activity.length}/500</span>
         </div>
         <div className="flex gap-4">
            <span className={recentErrors === 0 ? 'text-brand-green' : 'text-rose-500'}>
              {recentErrors === 0 ? 'SYSTEM_NOMINAL' : `ERRORS_${recentErrors}`}
            </span>
            <span className="opacity-40">FRONTEND_EVENT_BUFFER</span>
         </div>
      </div>
    </div>
  );
};

const formatDuration = (milliseconds: number) => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

export default LiveEventsView;
