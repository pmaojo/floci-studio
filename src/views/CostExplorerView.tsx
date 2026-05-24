import { useState, useEffect } from 'react';
import { sidecarApi, type CostForecastResult } from '../lib/sidecarApi';
import { PageHeader, Card, Button, Skeleton } from '../components/ui-elements';
import { TrendingUp, Wallet, RefreshCw, Layers, DollarSign } from 'lucide-react';
import { useAws } from '../contexts/AwsContext';

const CostExplorerView = () => {
  const { logActivity } = useAws();
  const [forecast, setForecast] = useState<CostForecastResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadForecast = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await sidecarApi.runCostForecast();
      if (response.ok) {
        setForecast(response);
        logActivity('CostExplorer', 'Calculate forecast', 'success', `total=$${response.totalMonthlyForecast}`);
      } else {
        throw new Error('Failed to compute forecast');
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to read cost forecast';
      setError(msg);
      logActivity('CostExplorer', 'Calculate forecast failed', 'error', msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadForecast();
  }, []);

  // Map service names to Tailwind background colors for the visual budget bar
  const getServiceColorClass = (service: string) => {
    switch (service.toLowerCase()) {
      case 's3 buckets':
        return 'bg-emerald-500';
      case 'ec2':
        return 'bg-indigo-500';
      case 'lambda':
        return 'bg-violet-500';
      case 'dynamodb':
        return 'bg-amber-500';
      case 'rds':
        return 'bg-rose-500';
      default:
        return 'bg-neutral-500';
    }
  };

  // Map service names to Tailwind text colors for legend matching
  const getServiceTextColorClass = (service: string) => {
    switch (service.toLowerCase()) {
      case 's3 buckets':
        return 'text-emerald-600';
      case 'ec2':
        return 'text-indigo-600';
      case 'lambda':
        return 'text-violet-600';
      case 'dynamodb':
        return 'text-amber-600';
      case 'rds':
        return 'text-rose-600';
      default:
        return 'text-neutral-600';
    }
  };

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader
        title="Cost Explorer & Forecast"
        icon={<Wallet size={18} />}
        onRefresh={loadForecast}
        isRefreshing={loading}
        actions={
          <Button onClick={loadForecast} disabled={loading} icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}>
            Run Cost Analysis
          </Button>
        }
      />

      <div className="p-6 space-y-6 flex-1 overflow-auto bg-brand-bg">
        {error && (
          <Card className="text-rose-600 font-mono text-[10px] bg-rose-50 border-rose-600 normal-case">
            {error}
          </Card>
        )}

        {loading ? (
          <div className="space-y-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-10" />
            <Skeleton className="h-64" />
          </div>
        ) : !forecast ? (
          <Card className="text-center py-12 border-dashed bg-brand-muted/20">
            <p className="text-[10px] font-bold tracking-widest">No Cost Analysis Data Available</p>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Hero Glow Metrics Card */}
            <div className="relative group overflow-hidden border border-brand-text bg-white p-6 shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <TrendingUp size={120} />
              </div>
              <p className="text-[10px] font-bold tracking-widest text-neutral-500 mb-2">PROJECTED MONTHLY BILLING</p>
              <div className="flex items-baseline gap-2">
                <span className="font-serif-italic text-5xl font-black text-brand-text tracking-tight flex items-center">
                  <DollarSign size={32} className="inline opacity-80" />
                  {forecast.totalMonthlyForecast.toFixed(2)}
                </span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 border border-emerald-600/20">
                  ESTIMATED
                </span>
              </div>
              <p className="text-[9px] font-mono text-neutral-500 mt-3 normal-case leading-relaxed">
                Esta proyección mensual se calcula en base al inventario de recursos emulados activos en Floci y a la tabla de precios estática <code>pricing-book.json</code>.
              </p>
            </div>

            {/* Proportional Cost Breakdown Bar Chart */}
            <Card className="p-5 space-y-4">
              <h3 className="text-[10px] font-bold tracking-wider">Visual Budget Allocation</h3>
              
              {forecast.totalMonthlyForecast === 0 ? (
                <div className="h-6 bg-brand-muted flex items-center justify-center border border-brand-text/10 text-[9px] font-mono opacity-50 normal-case">
                  Zero active billing resources currently provisioned.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Proportional Stacked Bar */}
                  <div className="w-full h-8 border border-brand-text flex overflow-hidden bg-brand-muted shrink-0 shadow-inner">
                    {forecast.forecasts.map((item) => {
                      if (item.monthly === 0) return null;
                      const percentage = (item.monthly / forecast.totalMonthlyForecast) * 100;
                      return (
                        <div
                          key={item.service}
                          style={{ width: `${percentage}%` }}
                          className={`${getServiceColorClass(item.service)} h-full transition-all duration-500 hover:opacity-90 relative group/bar border-r last:border-r-0 border-brand-text/25`}
                        />
                      );
                    })}
                  </div>

                  {/* Allocation Legend Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                    {forecast.forecasts.map((item) => {
                      const percentage = forecast.totalMonthlyForecast > 0 ? (item.monthly / forecast.totalMonthlyForecast) * 100 : 0;
                      return (
                        <div key={item.service} className="p-3 border border-brand-text/10 bg-brand-muted/20 font-mono">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className={`w-2.5 h-2.5 shrink-0 ${getServiceColorClass(item.service)} border border-brand-text`} />
                            <span className="text-[9px] font-bold tracking-wider">{item.service}</span>
                          </div>
                          <p className="text-xs font-bold font-display">{percentage.toFixed(1)}%</p>
                          <p className="text-[8px] opacity-40 normal-case font-mono mt-0.5">${item.monthly.toFixed(2)}/mo</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card>

            {/* Detailed Table */}
            <Card className="font-mono">
              <div className="flex items-center justify-between border-b border-brand-text/20 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Layers size={14} />
                  <h3 className="text-[10px] font-bold tracking-wider">Detailed Forecast Computations</h3>
                </div>
                <span className="text-[9px] font-bold border border-brand-text px-2 py-0.5 bg-brand-muted">
                  TOTAL ITEMS: {forecast.forecasts.length}
                </span>
              </div>

              <div className="border border-brand-text/20 overflow-x-auto">
                <table className="w-full text-left text-[10px]">
                  <thead className="bg-brand-muted border-b border-brand-text/20">
                    <tr>
                      <th className="p-3">Service</th>
                      <th className="p-3">Resource Type</th>
                      <th className="p-3">Count</th>
                      <th className="p-3">Pricing Rate</th>
                      <th className="p-3">Monthly Forecast</th>
                      <th className="p-3 text-right">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecast.forecasts.map((item) => (
                      <tr key={item.service} className="border-b border-brand-text/10 align-middle hover:bg-neutral-50/50 transition-colors">
                        <td className="p-3 font-bold tracking-wide">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 shrink-0 ${getServiceColorClass(item.service)} rounded-full`} />
                            {item.service}
                          </div>
                        </td>
                        <td className="p-3 text-neutral-600">{item.resourceType}</td>
                        <td className="p-3 font-bold">{item.count}</td>
                        <td className="p-3 text-neutral-600 normal-case">
                          {item.service.toLowerCase() === 's3 buckets' ? (
                            <span>$0.023/GB (Est. 50GB/bucket)</span>
                          ) : item.service.toLowerCase() === 'ec2' ? (
                            <span>$0.0104/Hour (Est. 730h/mo)</span>
                          ) : item.service.toLowerCase() === 'lambda' ? (
                            <span>$0.20/1M Invocations (Est. 1M/mo)</span>
                          ) : item.service.toLowerCase() === 'dynamodb' ? (
                            <span>$2.50/Table-Month</span>
                          ) : item.service.toLowerCase() === 'rds' ? (
                            <span>$0.017/Hour (Est. 730h/mo)</span>
                          ) : (
                            <span>Static rate</span>
                          )}
                        </td>
                        <td className={`p-3 font-bold text-sm ${getServiceTextColorClass(item.service)}`}>
                          ${item.monthly.toFixed(2)}
                        </td>
                        <td className="p-3 text-right">
                          <span className={`text-[8px] font-bold border px-1.5 py-0.5 rounded-sm uppercase tracking-wider ${
                            item.source === 'real-aws-cli' 
                              ? 'border-emerald-600/25 bg-emerald-50 text-emerald-800' 
                              : 'border-amber-600/25 bg-amber-50 text-amber-800'
                          }`}>
                            {item.source}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default CostExplorerView;
