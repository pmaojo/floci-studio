import { useEffect, useRef, useState } from 'react';
import { Card, Input } from '../../components/ui-elements';

export default function LambdaLogsView() {
  const [logs, setLogs] = useState<string[]>([]);
  const [filter, setFilter] = useState('');
  const wsRef = useRef<WebSocket | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/sidecar/api/studio/lambda-logs/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'log' || data.type === 'info') {
          setLogs(prev => [...prev, data.message || data.content].slice(-1000));
        }
      } catch {
        setLogs(prev => [...prev, event.data].slice(-1000));
      }
    };

    const interval = setInterval(() => {
        if(ws.readyState === WebSocket.OPEN) {
            ws.send("ping");
        }
    }, 30000);

    return () => {
      clearInterval(interval);
      ws.close();
    };
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const filteredLogs = logs.filter(l => l.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Lambda Logs Stream</h1>
        <p className="text-slate-400">Real-time retro console for your Dockerized Lambdas</p>
      </div>

      <Card className="flex-1 flex flex-col min-h-[600px] p-0">
        <div className="flex flex-row items-center justify-between border-b border-brand-text bg-brand-muted p-4">
          <h3 className="font-serif-italic text-lg text-brand-text">Live Console</h3>
          <div className="w-64">
            <Input
              placeholder="Filter logs..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 bg-black p-4 font-mono text-sm overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <div className="text-slate-500 italic">Waiting for logs...</div>
          ) : (
            filteredLogs.map((log, i) => {
                let color = "text-green-400";
                if(log.includes("ERROR") || log.includes("Exception")) color = "text-red-500";
                else if (log.includes("WARN")) color = "text-yellow-400";
                return <div key={i} className={`${color} mb-1 break-all`}>{log}</div>
            })
          )}
          <div ref={logsEndRef} />
        </div>
      </Card>
    </div>
  );
}
