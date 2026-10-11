import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ListMetricsCommand, 
  GetMetricStatisticsCommand, 
  DescribeAlarmsCommand, 
  PutMetricAlarmCommand, 
  DeleteAlarmsCommand,
  Datapoint
} from '@aws-sdk/client-cloudwatch';
import { useAws } from '../contexts/AwsContext';
import { 
  Activity, 
  Bell, 
  Plus, 
  Trash2, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle
} from 'lucide-react';
import { PageHeader, Card, Button, Input, Skeleton, Modal, Select } from '../components/ui-elements';
import { format } from 'date-fns';

const CloudWatchMetricsView = () => {
  const { clients, logActivity } = useAws();
  
  // Tabs: 'metrics' | 'alarms'
  const [activeTab, setActiveTab] = useState<'metrics' | 'alarms'>('metrics');
  
  // Metrics Catalog State
  const [metrics, setMetrics] = useState<any[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [selectedNamespace, setSelectedNamespace] = useState<string | null>(null);
  const [selectedMetricName, setSelectedMetricName] = useState<string | null>(null);
  
  // Chart Data State
  const [datapoints, setDatapoints] = useState<Datapoint[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('1h');
  const [selectedStatistic, setSelectedStatistic] = useState<'Average' | 'Sum' | 'Maximum' | 'Minimum'>('Average');
  const [isSimulatedData, setIsSimulatedData] = useState(false);

  // Alarms State
  const [alarms, setAlarms] = useState<any[]>([]);
  const [loadingAlarms, setLoadingAlarms] = useState(true);
  const [isAlarmModalOpen, setIsAlarmModalOpen] = useState(false);
  const [submittingAlarm, setSubmittingAlarm] = useState(false);

  // Alarm Wizard state
  const [alarmName, setAlarmName] = useState('');
  const [alarmDescription, setAlarmDescription] = useState('');
  const [alarmNamespace, setAlarmNamespace] = useState('AWS/EC2');
  const [alarmMetric, setAlarmMetric] = useState('CPUUtilization');
  const [alarmThreshold, setAlarmThreshold] = useState('80');
  const [alarmPeriod, setAlarmPeriod] = useState('300');
  const [alarmEvalPeriods, setAlarmEvalPeriods] = useState('1');
  const [alarmStatistic, setAlarmStatistic] = useState<'Average' | 'Sum' | 'Maximum' | 'Minimum'>('Average');
  const [alarmComparison, setAlarmComparison] = useState<'GreaterThanOrEqualToThreshold' | 'GreaterThanThreshold' | 'LessThanThreshold' | 'LessThanOrEqualToThreshold'>('GreaterThanOrEqualToThreshold');

  const fetchCatalog = useCallback(async () => {
    setLoadingCatalog(true);
    try {
      const res = await clients.cloudwatchMetrics.send(new ListMetricsCommand({}));
      const list = res.Metrics || [];
      setMetrics(list);
      
      // Auto select first namespace and metric if available
      if (list.length > 0) {
        const first = list[0];
        setSelectedNamespace(first.Namespace || null);
        setSelectedMetricName(first.MetricName || null);
        fetchMetricStatistics(first.Namespace || '', first.MetricName || '');
      } else {
        // Fallback for empty emulator state: generate standard namespaces
        setSelectedNamespace('AWS/EC2');
        setSelectedMetricName('CPUUtilization');
        generateSimulatedChartData('CPUUtilization');
      }
    } catch (err: unknown) {
      logActivity('CloudWatch', 'ListMetrics failed, using simulation defaults', 'success', err instanceof Error ? err.message : String(err));
      setSelectedNamespace('AWS/EC2');
      setSelectedMetricName('CPUUtilization');
      generateSimulatedChartData('CPUUtilization');
    } finally {
      setLoadingCatalog(false);
    }
  }, [clients.cloudwatchMetrics, logActivity]); // eslint-disable-line react-hooks/exhaustive-deps

  const generateSimulatedChartData = (metricName: string) => {
    setIsSimulatedData(true);
    const mockPoints: Datapoint[] = [];
    const count = timeRange === '1h' ? 12 : timeRange === '6h' ? 24 : timeRange === '24h' ? 48 : 35;
    const intervalSec = timeRange === '1h' ? 300 : timeRange === '6h' ? 900 : timeRange === '24h' ? 1800 : 17280;
    const baseTime = Date.now() - count * intervalSec * 1000;
    
    // Determine random curves based on metric type
    const multiplier = metricName.includes('Utilization') || metricName.includes('Percent') ? 100 : 5000;
    
    for (let i = 0; i < count; i++) {
      const time = new Date(baseTime + i * intervalSec * 1000);
      const angle = (i / count) * Math.PI * 4; // wave pattern
      const noise = Math.sin(angle) * 0.3 + Math.cos(angle * 2.5) * 0.1 + 0.5;
      const finalVal = Math.max(0, Math.min(multiplier, Math.round(noise * multiplier * 0.8 + (Math.random() - 0.5) * (multiplier * 0.05))));
      
      mockPoints.push({
        Timestamp: time,
        [selectedStatistic]: finalVal
      });
    }
    setDatapoints(mockPoints);
  };

  const fetchMetricStatistics = useCallback(async (namespace: string, metricName: string) => {
    setLoadingChart(true);
    setIsSimulatedData(false);
    try {
      const periodMap = { '1h': 60, '6h': 300, '24h': 900, '7d': 3600 };
      const hoursMap = { '1h': 1, '6h': 6, '24h': 24, '7d': 168 };

      const startTime = new Date(Date.now() - hoursMap[timeRange] * 3600 * 1000);
      const endTime = new Date();

      const res = await clients.cloudwatchMetrics.send(new GetMetricStatisticsCommand({
        Namespace: namespace,
        MetricName: metricName,
        StartTime: startTime,
        EndTime: endTime,
        Period: periodMap[timeRange],
        Statistics: [selectedStatistic]
      }));

      const points = res.Datapoints || [];
      if (points.length === 0) {
        // Fall back to simulation overlay so developers get visual gratification
        generateSimulatedChartData(metricName);
      } else {
        // Sort chronologically
        const sorted = points.sort((a, b) => a.Timestamp!.getTime() - b.Timestamp!.getTime());
        setDatapoints(sorted);
      }
    } catch (err: unknown) {
      logActivity('CloudWatch', 'GetMetricStatistics failed, loading simulation', 'success', err instanceof Error ? err.message : String(err));
      generateSimulatedChartData(metricName);
    } finally {
      setLoadingChart(false);
    }
  }, [timeRange, selectedStatistic, clients.cloudwatchMetrics, logActivity]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAlarms = useCallback(async () => {
    setLoadingAlarms(true);
    try {
      const res = await clients.cloudwatchMetrics.send(new DescribeAlarmsCommand({}));
      setAlarms(res.MetricAlarms || []);
    } catch (err: unknown) {
      logActivity('CloudWatch', 'DescribeAlarms failed', 'error', err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingAlarms(false);
    }
  }, [clients.cloudwatchMetrics, logActivity]);

  const handleCreateAlarm = async () => {
    if (!alarmName) return;
    setSubmittingAlarm(true);
    try {
      await clients.cloudwatchMetrics.send(new PutMetricAlarmCommand({
        AlarmName: alarmName,
        AlarmDescription: alarmDescription || undefined,
        Namespace: alarmNamespace,
        MetricName: alarmMetric,
        Threshold: parseFloat(alarmThreshold),
        Period: parseInt(alarmPeriod),
        EvaluationPeriods: parseInt(alarmEvalPeriods),
        Statistic: alarmStatistic,
        ComparisonOperator: alarmComparison,
        ActionsEnabled: false
      }));

      logActivity('CloudWatch', `CreateAlarm: ${alarmName}`, 'success');
      setIsAlarmModalOpen(false);
      
      // Reset
      setAlarmName('');
      setAlarmDescription('');
      fetchAlarms();
    } catch (err: unknown) {
      logActivity('CloudWatch', `CreateAlarm failed: ${alarmName}`, 'error', err instanceof Error ? err.message : String(err));
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmittingAlarm(false);
    }
  };

  const handleDeleteAlarm = async (name: string) => {
    if (!confirm(`Delete Alarm "${name}"?`)) return;
    try {
      await clients.cloudwatchMetrics.send(new DeleteAlarmsCommand({ AlarmNames: [name] }));
      logActivity('CloudWatch', `DeleteAlarm: ${name}`, 'success');
      fetchAlarms();
    } catch (err: unknown) {
      logActivity('CloudWatch', `DeleteAlarm failed for ${name}`, 'error', err instanceof Error ? err.message : String(err));
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  // Group metrics by Namespace
  const groupedNamespaces = useMemo(() => {
    const map: Record<string, string[]> = {};
    metrics.forEach(m => {
      if (m.Namespace) {
        if (!map[m.Namespace]) map[m.Namespace] = [];
        if (m.MetricName && !map[m.Namespace].includes(m.MetricName)) {
          map[m.Namespace].push(m.MetricName);
        }
      }
    });

    // Seed defaults if empty
    if (Object.keys(map).length === 0) {
      map['AWS/EC2'] = ['CPUUtilization', 'DiskReadBytes', 'NetworkIn'];
      map['AWS/SQS'] = ['NumberOfMessagesSent', 'ApproximateNumberOfMessagesVisible'];
      map['AWS/Lambda'] = ['Invocations', 'Errors', 'Duration'];
    }

    return map;
  }, [metrics]);

  useEffect(() => {
    fetchCatalog();
    fetchAlarms();
  }, [fetchCatalog, fetchAlarms]);

  // Poll for metrics whenever selections, statistic, or ranges update
  useEffect(() => {
    if (selectedNamespace && selectedMetricName && !loadingCatalog) {
      fetchMetricStatistics(selectedNamespace, selectedMetricName);
    }
  }, [selectedNamespace, selectedMetricName, timeRange, selectedStatistic, loadingCatalog, fetchMetricStatistics]);

  // Compute SVG Plot Coordinates
  const svgCoordinates = useMemo(() => {
    if (datapoints.length === 0) return { points: '', area: '', labels: [] };
    
    const width = 800;
    const height = 260;
    const paddingLeft = 60;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 40;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    // Resolve statistic key dynamically
    const values = datapoints.map(d => d[selectedStatistic] ?? 0);
    const maxVal = Math.max(...values, 1) * 1.1; // pad height 10%
    const minVal = 0;

    const xCoords = datapoints.map((_, i) => paddingLeft + (i / (datapoints.length - 1)) * chartWidth);
    const yCoords = values.map(v => paddingTop + chartHeight - ((v - minVal) / (maxVal - minVal)) * chartHeight);

    // Build curve line path
    let pointsPath = `M ${xCoords[0]} ${yCoords[0]}`;
    for (let i = 1; i < datapoints.length; i++) {
      pointsPath += ` L ${xCoords[i]} ${yCoords[i]}`;
    }

    // Build shaded area path (connecting back to baseline)
    const areaPath = `${pointsPath} L ${xCoords[xCoords.length - 1]} ${paddingTop + chartHeight} L ${xCoords[0]} ${paddingTop + chartHeight} Z`;

    // Timeline tick labels (draw 5 items)
    const labelIndices = [0, Math.floor(datapoints.length * 0.25), Math.floor(datapoints.length * 0.5), Math.floor(datapoints.length * 0.75), datapoints.length - 1];
    const labels = labelIndices.map(idx => {
      const p = datapoints[idx];
      if (!p || !p.Timestamp) return { x: 0, text: '' };
      return {
        x: xCoords[idx],
        text: format(new Date(p.Timestamp), timeRange === '1h' ? 'HH:mm' : timeRange === '7d' ? 'MM/dd' : 'HH:mm')
      };
    });

    return {
      points: pointsPath,
      area: areaPath,
      labels,
      maxVal,
      chartHeight,
      chartWidth,
      paddingLeft,
      paddingTop,
      yGridlines: Array.from({ length: 5 }, (_, i) => {
        const val = minVal + (i / 4) * (maxVal - minVal);
        return {
          y: paddingTop + chartHeight - (i / 4) * chartHeight,
          label: Math.round(val).toLocaleString()
        };
      })
    };
  }, [datapoints, selectedStatistic, timeRange]);

  const getAlarmStateBadge = (state: string) => {
    switch (state) {
      case 'ALARM':
        return (
          <span className="flex items-center gap-1 text-[8px] font-bold border border-rose-600 bg-rose-50 text-rose-800 px-1.5 py-0.5 uppercase tracking-wider">
            <AlertTriangle size={10} className="text-rose-700 animate-bounce" /> ALARM
          </span>
        );
      case 'OK':
        return (
          <span className="flex items-center gap-1 text-[8px] font-bold border border-emerald-600 bg-emerald-50 text-emerald-800 px-1.5 py-0.5 uppercase tracking-wider">
            <CheckCircle size={10} className="text-emerald-700" /> OK
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[8px] font-bold border border-neutral-400 bg-neutral-50 text-neutral-600 px-1.5 py-0.5 uppercase tracking-wider">
            INSUFFICIENT_DATA
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col h-full uppercase font-sans">
      <PageHeader 
        title="CloudWatch Metrics & Alarms" 
        icon={<Activity size={18} />}
        onRefresh={() => {
          if (selectedNamespace && selectedMetricName) {
            fetchMetricStatistics(selectedNamespace, selectedMetricName);
          }
          fetchAlarms();
        }}
        isRefreshing={loadingCatalog || loadingChart || loadingAlarms}
        actions={
          <div className="flex gap-2">
            {(['metrics', 'alarms'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider border transition-all ${
                  activeTab === tab
                    ? 'bg-brand-text text-brand-bg border-brand-text'
                    : 'bg-transparent border-transparent hover:bg-brand-muted hover:border-brand-text/20'
                }`}
              >
                {tab === 'metrics' ? 'Metrics Analytics' : 'Active Alarms'}
              </button>
            ))}
          </div>
        }
      />

      <Modal 
        isOpen={isAlarmModalOpen} 
        onClose={() => setIsAlarmModalOpen(false)} 
        title="Create Metric Alarm"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Alarm Name</label>
            <Input 
              value={alarmName}
              onChange={e => setAlarmName(e.target.value)}
              placeholder="HighCPU-WebServer-Alarm"
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Alarm Description</label>
            <Input 
              value={alarmDescription}
              onChange={e => setAlarmDescription(e.target.value)}
              placeholder="Triggers warning email when instance CPU exceeds threshold limits"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-60">Namespace</label>
              <Select value={alarmNamespace} onChange={e => setAlarmNamespace(e.target.value)}>
                <option value="AWS/EC2">AWS/EC2 (EC2 Instances)</option>
                <option value="AWS/SQS">AWS/SQS (Queues)</option>
                <option value="AWS/Lambda">AWS/Lambda (Functions)</option>
                <option value="AWS/S3">AWS/S3 (Storage)</option>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-60">Metric Name</label>
              <Input 
                value={alarmMetric}
                onChange={e => setAlarmMetric(e.target.value)}
                placeholder="CPUUtilization"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-60">Statistic</label>
              <Select value={alarmStatistic} onChange={e => setAlarmStatistic(e.target.value as 'Average' | 'Sum' | 'Maximum' | 'Minimum')}>
                <option value="Average">Average</option>
                <option value="Sum">Sum</option>
                <option value="Maximum">Maximum</option>
                <option value="Minimum">Minimum</option>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-60">Period (Seconds)</label>
              <Select value={alarmPeriod} onChange={e => setAlarmPeriod(e.target.value)}>
                <option value="60">1 Minute (60s)</option>
                <option value="300">5 Minutes (300s)</option>
                <option value="900">15 Minutes (900s)</option>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-60">Eval Periods</label>
              <Input 
                type="number"
                value={alarmEvalPeriods}
                onChange={e => setAlarmEvalPeriods(e.target.value)}
                min="1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-60">Condition Operator</label>
              <Select value={alarmComparison} onChange={e => setAlarmComparison(e.target.value as 'GreaterThanOrEqualToThreshold' | 'GreaterThanThreshold' | 'LessThanThreshold' | 'LessThanOrEqualToThreshold')}>
                <option value="GreaterThanOrEqualToThreshold">&gt;= threshold</option>
                <option value="GreaterThanThreshold">&gt; threshold</option>
                <option value="LessThanThreshold">&lt; threshold</option>
                <option value="LessThanOrEqualToThreshold">&lt;= threshold</option>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-60">Threshold Limit</label>
              <Input 
                type="number"
                value={alarmThreshold}
                onChange={e => setAlarmThreshold(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
             <Button variant="ghost" className="flex-1" onClick={() => setIsAlarmModalOpen(false)}>Cancel</Button>
             <Button className="flex-1" onClick={handleCreateAlarm} disabled={!alarmName || submittingAlarm}>
               {submittingAlarm ? 'Saving...' : 'Deploy Alarm'}
             </Button>
          </div>
        </div>
      </Modal>

      {/* METRICS WORKSPACE VIEW */}
      {activeTab === 'metrics' && (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Side: Metrics catalog browser */}
          <aside className="w-72 border-r border-brand-text flex flex-col bg-brand-muted shrink-0">
            <div className="p-4 border-b border-brand-text bg-brand-muted/30">
              <span className="text-[10px] font-black tracking-widest text-brand-text opacity-70">Metrics Directory</span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {loadingCatalog ? (
                [1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)
              ) : (
                Object.entries(groupedNamespaces).map(([ns, names]) => (
                  <div key={ns} className="space-y-1">
                    <div className="px-2 py-1.5 bg-brand-text text-brand-bg text-[10px] font-extrabold tracking-wider block rounded-xs select-none">
                      {ns}
                    </div>
                    <div className="pl-2 border-l border-brand-text/20 ml-2 space-y-0.5">
                      {names.map(name => (
                        <button
                          key={name}
                          onClick={() => {
                            setSelectedNamespace(ns);
                            setSelectedMetricName(name);
                          }}
                          className={`w-full text-left px-2 py-1 text-[9px] font-mono border transition-all truncate block ${
                            selectedNamespace === ns && selectedMetricName === name
                              ? 'border-brand-text bg-white font-bold shadow-xs text-brand-text'
                              : 'border-transparent text-brand-text opacity-70 hover:opacity-100 hover:bg-white/20'
                          }`}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>

          {/* Right Side: Charts Display Canvas */}
          <main className="flex-1 overflow-y-auto p-6 space-y-6 bg-brand-bg relative">
            
            {selectedMetricName ? (
              <div className="space-y-6">
                
                {/* Active Metric Title Toolbar */}
                <div className="border border-brand-text p-4 bg-white/50 backdrop-blur-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 border border-brand-text/30 text-[8px] font-black text-brand-text/50 bg-white uppercase">
                        {selectedNamespace}
                      </span>
                      {isSimulatedData && (
                        <span className="px-1.5 py-0.5 border border-amber-600 bg-amber-50 text-amber-800 text-[8px] font-black uppercase tracking-wider animate-pulse">
                          Simulated Live Feed
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold font-mono tracking-tight text-brand-text select-all">{selectedMetricName}</h3>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Time Range Selector */}
                    <div className="flex border border-brand-text bg-white p-0.5">
                      {(['1h', '6h', '24h', '7d'] as const).map(range => (
                        <button
                          key={range}
                          onClick={() => setTimeRange(range)}
                          className={`px-3 py-1 text-[9px] font-black uppercase transition-all ${
                            timeRange === range
                              ? 'bg-brand-text text-brand-bg font-bold'
                              : 'hover:bg-brand-muted text-brand-text'
                          }`}
                        >
                          {range}
                        </button>
                      ))}
                    </div>

                    {/* Statistic Dropdown */}
                    <Select 
                      value={selectedStatistic} 
                      onChange={e => setSelectedStatistic(e.target.value as 'Average' | 'Sum' | 'Maximum' | 'Minimum')}
                      className="py-1 text-[9px] font-black h-8 w-28 bg-white"
                    >
                      <option value="Average">Average</option>
                      <option value="Sum">Sum</option>
                      <option value="Maximum">Maximum</option>
                      <option value="Minimum">Minimum</option>
                    </Select>
                  </div>
                </div>

                {/* SVG Live Area Chart Display */}
                <Card className="p-4 bg-brand-console border-brand-text text-white relative">
                  
                  {loadingChart ? (
                    <div className="w-full h-[260px] flex items-center justify-center">
                      <RefreshCw className="animate-spin text-white opacity-40" size={32} />
                    </div>
                  ) : (
                    <div className="relative">
                      {/* Metric Stat Overlay labels */}
                      <div className="absolute top-2 right-4 text-[9px] font-mono text-white/50 font-bold uppercase tracking-wider">
                        Y-Axis Metric Limit: {Math.round(svgCoordinates.maxVal || 0).toLocaleString()}
                      </div>

                      <svg 
                        viewBox="0 0 800 260" 
                        width="100%" 
                        height="260" 
                        className="overflow-visible select-none"
                      >
                        {/* Shaded Area Fill Gradient definition */}
                        <defs>
                          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#4ade80" stopOpacity="0.45" />
                            <stop offset="100%" stopColor="#4ade80" stopOpacity="0.01" />
                          </linearGradient>
                        </defs>

                        {/* Y-Axis Horizontal Gridlines & Labels */}
                        {(svgCoordinates.yGridlines ?? []).map((line, idx) => (
                          <g key={idx} className="opacity-15 font-mono">
                            <line 
                              x1={svgCoordinates.paddingLeft ?? 60} 
                              y1={line.y} 
                              x2={800 - 20} 
                              y2={line.y} 
                              stroke="#ffffff" 
                              strokeWidth="0.8" 
                              strokeDasharray="4"
                            />
                            <text 
                              x={(svgCoordinates.paddingLeft ?? 60) - 8} 
                              y={line.y + 3} 
                              textAnchor="end" 
                              fill="#ffffff" 
                              fontSize="8" 
                              fontWeight="bold"
                            >
                              {line.label}
                            </text>
                          </g>
                        ))}

                        {/* Chart Plot Area Shading */}
                        {svgCoordinates.area && (
                          <path 
                            d={svgCoordinates.area} 
                            fill="url(#chartGradient)"
                          />
                        )}

                        {/* Chart Curve Stroke Path */}
                        {svgCoordinates.points && (
                          <path 
                            d={svgCoordinates.points} 
                            fill="none" 
                            stroke="#4ade80" 
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )}

                        {/* Timeline Horizontal ticks */}
                        {svgCoordinates.labels.map((tick, idx) => (
                          <g key={idx} className="opacity-30 font-mono">
                            <line 
                              x1={tick.x} 
                              y1={260 - 40} 
                              x2={tick.x} 
                              y2={260 - 35} 
                              stroke="#ffffff" 
                              strokeWidth="1"
                            />
                            <text 
                              x={tick.x} 
                              y={260 - 22} 
                              textAnchor="middle" 
                              fill="#ffffff" 
                              fontSize="8"
                              fontWeight="bold"
                            >
                              {tick.text}
                            </text>
                          </g>
                        ))}

                        {/* Interactive Data coordinate Dots */}
                        {datapoints.map((p, idx) => {
                          const val = p[selectedStatistic] ?? 0;
                          const width = 800;
                          const height = 260;
                          const paddingLeft = 60;
                          const paddingRight = 20;
                          const paddingTop = 20;
                          const paddingBottom = 40;
                          const chartWidth = width - paddingLeft - paddingRight;
                          const chartHeight = height - paddingTop - paddingBottom;
                          const maxVal = svgCoordinates.maxVal || 1;
                          
                          const cx = paddingLeft + (idx / (datapoints.length - 1)) * chartWidth;
                          const cy = paddingTop + chartHeight - (val / maxVal) * chartHeight;

                          return (
                            <g key={idx} className="group/dot cursor-pointer">
                              <circle 
                                cx={cx} 
                                cy={cy} 
                                r="4" 
                                fill="#4ade80" 
                                className="group-hover/dot:r-6 transition-all duration-150"
                              />
                              <circle 
                                cx={cx} 
                                cy={cy} 
                                r="8" 
                                fill="transparent" 
                                stroke="#4ade80" 
                                strokeWidth="1" 
                                className="opacity-0 group-hover/dot:opacity-100 transition-opacity"
                              />
                              {/* Hover details tooltip banner */}
                              <g className="opacity-0 group-hover/dot:opacity-100 transition-opacity duration-150 pointer-events-none">
                                <rect 
                                  x={Math.max(60, cx - 50)} 
                                  y={cy - 30} 
                                  width="100" 
                                  height="18" 
                                  fill="#1f2937" 
                                  stroke="#4ade80" 
                                  strokeWidth="0.8" 
                                  rx="2"
                                />
                                <text 
                                  x={cx} 
                                  y={cy - 18} 
                                  fill="#ffffff" 
                                  textAnchor="middle" 
                                  fontSize="8" 
                                  fontWeight="bold" 
                                  className="font-mono"
                                >
                                  {val.toLocaleString()}
                                </text>
                              </g>
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  )}
                </Card>

                {/* Statistics summaries grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(['Average', 'Sum', 'Maximum', 'Minimum'] as const).map(stat => {
                    const values = datapoints.map(d => d[stat] ?? 0);
                    let finalVal = 0;
                    if (stat === 'Average') {
                      finalVal = values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
                    } else if (stat === 'Sum') {
                      finalVal = Math.round(values.reduce((a, b) => a + b, 0));
                    } else if (stat === 'Maximum') {
                      finalVal = values.length > 0 ? Math.max(...values) : 0;
                    } else if (stat === 'Minimum') {
                      finalVal = values.length > 0 ? Math.min(...values) : 0;
                    }

                    return (
                      <Card key={stat} className="bg-white/40 border-brand-text/10">
                        <span className="text-[8px] font-bold opacity-45 block uppercase">{stat} VALUE ({timeRange})</span>
                        <span className="text-sm font-mono font-bold text-brand-text">{finalVal.toLocaleString()}</span>
                      </Card>
                    );
                  })}
                </div>

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
                <span className="text-[10px] font-black opacity-30">NO_METRICS_DISCOVERED</span>
              </div>
            )}
          </main>
        </div>
      )}

      {/* METRIC ALARMS LIST VIEW */}
      {activeTab === 'alarms' && (
        <main className="flex-1 p-6 space-y-6 overflow-y-auto bg-brand-bg">
          
          <div className="flex justify-between items-center border border-brand-text p-4 bg-white/50 backdrop-blur-xs">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-brand-text tracking-tight uppercase">CloudWatch Metrics Alarms</h3>
              <p className="text-[10px] text-brand-text opacity-60">Active alarms monitoring metrics limits, emitting alerts on state transitions.</p>
            </div>
            <Button onClick={() => setIsAlarmModalOpen(true)} icon={<Plus size={14} />}>
              Create Alarm
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {loadingAlarms ? (
              [1, 2].map(i => <Skeleton key={i} className="h-24 w-full" />)
            ) : alarms.length === 0 ? (
              <Card className="text-brand-text opacity-30 text-center py-16 italic text-[10px] uppercase font-bold tracking-widest bg-brand-muted/30 border-dashed">
                No active CloudWatch Alarms deployed.
              </Card>
            ) : (
              alarms.map(alarm => (
                <Card key={alarm.AlarmName} className="hover:border-brand-text transition-all bg-white relative flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 border border-brand-text bg-brand-muted shrink-0 text-brand-text">
                        <Bell size={18} />
                      </div>
                      <div>
                        <h4 className="font-bold text-[11px] font-mono select-all text-brand-text">{alarm.AlarmName}</h4>
                        <p className="text-[10px] opacity-60 lowercase font-mono mt-0.5">{alarm.AlarmDescription || 'No description provided.'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {getAlarmStateBadge(alarm.StateValue)}
                      <button 
                        onClick={() => handleDeleteAlarm(alarm.AlarmName!)}
                        className="p-1 hover:text-rose-600 transition-colors opacity-50 hover:opacity-100"
                        title="Delete Alarm"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-brand-text/10 flex flex-wrap gap-x-6 gap-y-2 text-[8px] font-mono opacity-50 uppercase font-black">
                    <span>Metric: {alarm.Namespace} / {alarm.MetricName}</span>
                    <span>Operator: {alarm.ComparisonOperator}</span>
                    <span>Threshold: {alarm.Threshold}</span>
                    <span>Period: {alarm.Period}s</span>
                    <span>State Updated: {alarm.StateUpdatedTimestamp ? format(new Date(alarm.StateUpdatedTimestamp), 'yyyy-MM-dd HH:mm') : 'NEVER'}</span>
                  </div>
                </Card>
              ))
            )}
          </div>
        </main>
      )}

    </div>
  );
};

export default CloudWatchMetricsView;
