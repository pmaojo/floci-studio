import { useState, useEffect } from 'react';
import { ListCertificatesCommand, RequestCertificateCommand } from '@aws-sdk/client-acm';
import { useAws } from '../contexts/AwsContext';
import { Search, CirclePlus, ExternalLink, BadgeCheck, ShieldCheck } from 'lucide-react';
import { PageHeader, Card, Button, Input, Skeleton } from '../components/ui-elements';

const ACMView = () => {
  const { clients, logActivity } = useAws();
  const [certs, setCerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchCerts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await clients.acm.send(new ListCertificatesCommand({}));
      setCerts(response.CertificateSummaryList || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch ACM certificates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCerts();
  }, []);

  const handleRequestCert = async () => {
    const domain = prompt('Domain Name (e.g. *.localhost):');
    if (!domain) return;
    try {
      await clients.acm.send(new RequestCertificateCommand({
        DomainName: domain,
        ValidationMethod: 'DNS'
      }));
      logActivity('ACM', `RequestCert: ${domain}`, 'success');
      fetchCerts();
    } catch (err: any) {
      logActivity('ACM', `RequestCert failed: ${domain}`, 'error', err.message);
      alert(err.message);
    }
  };

  const filteredCerts = certs.filter(c => c.DomainName?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader 
        title="ACM / Certificates" 
        icon={<BadgeCheck size={18} />}
        onRefresh={fetchCerts}
        isRefreshing={loading}
        actions={
          <Button onClick={handleRequestCert} icon={<CirclePlus size={14} />}>
            Request Cert
          </Button>
        }
      />

      <div className="p-6 space-y-6 flex-1 overflow-auto bg-brand-bg">
        {error && (
          <Card className="text-rose-600 font-mono text-[10px] bg-rose-50 border-rose-600 normal-case">
            {error}
          </Card>
        )}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text opacity-30" size={14} />
          <Input 
            placeholder="Filter Domains..." 
            className="pl-10 font-mono text-[11px]" 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4">
          {loading ? (
            [1, 2].map(i => <Skeleton key={i} className="h-20" />)
          ) : filteredCerts.length === 0 ? (
            <Card className="text-center py-20 border-dashed bg-brand-muted/10">
               <p className="text-[10px] font-bold opacity-30 tracking-widest">ZERO_CERTIFICATES_ISSUED</p>
            </Card>
          ) : (
            filteredCerts.map(cert => (
              <Card key={cert.CertificateArn} className="hover:bg-brand-text hover:text-white transition-colors group cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 border border-brand-text flex items-center justify-center opacity-40 group-hover:border-brand-bg group-hover:opacity-100">
                      <ShieldCheck size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-[11px] font-mono">{cert.DomainName}</h4>
                      <p className="text-[9px] opacity-50 truncate max-w-lg lowercase">{cert.CertificateArn}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                     <span className="text-[10px] font-bold opacity-40">{cert.Status || 'SUMMARY'}</span>
                     <ExternalLink size={14} className="opacity-20 group-hover:opacity-100" />
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ACMView;
