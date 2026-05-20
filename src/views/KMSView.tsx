import React, { useState, useEffect } from 'react';
import { ListKeysCommand, CreateKeyCommand, ScheduleKeyDeletionCommand } from '@aws-sdk/client-kms';
import { useAws } from '../contexts/AwsContext';
import { Key, Search, CirclePlus, Trash2, Shield, Fingerprint } from 'lucide-react';
import { PageHeader, Card, Button, Input, Skeleton } from '../components/ui-elements';
import { motion } from 'motion/react';

const KMSView = () => {
  const { clients, logActivity } = useAws();
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchKeys = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await clients.kms.send(new ListKeysCommand({}));
      setKeys(response.Keys || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch KMS keys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleCreateKey = async () => {
    try {
      await clients.kms.send(new CreateKeyCommand({
        Description: 'Key created via Floci Manager',
        Tags: [{ TagKey: 'CreatedBy', TagValue: 'FlociManager' }]
      }));
      logActivity('KMS', 'CreateKey', 'success');
      fetchKeys();
    } catch (err: any) {
      logActivity('KMS', 'CreateKey failed', 'error', err.message);
      alert(err.message);
    }
  };

  const filteredKeys = keys.filter(k => k.KeyId?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader 
        title="KMS / Cryptography" 
        icon={<Fingerprint size={18} />}
        onRefresh={fetchKeys}
        isRefreshing={loading}
        actions={
          <Button onClick={handleCreateKey} icon={<CirclePlus size={14} />}>
            Generate Key
          </Button>
        }
      />

      <div className="p-6 space-y-6 flex-1 overflow-auto bg-brand-bg">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text opacity-30" size={14} />
          <Input 
            placeholder="Filter Keys..." 
            className="pl-10 font-mono text-[11px]" 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            [1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)
          ) : filteredKeys.length === 0 ? (
            <div className="col-span-full py-20 text-center border-dashed border-brand-text/30 border bg-brand-muted/10">
               <p className="text-[10px] font-bold opacity-30 tracking-widest">NO_KEYS_AVAILABLE</p>
            </div>
          ) : (
            filteredKeys.map(key => (
              <Card key={key.KeyId} className="hover:bg-brand-text hover:text-white transition-colors group cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 border border-brand-text flex items-center justify-center opacity-40 group-hover:border-brand-bg group-hover:opacity-100">
                    <Key size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-bold opacity-40 mb-1">KEY_ID</p>
                    <p className="text-[11px] font-mono font-bold truncate">{key.KeyId}</p>
                    <p className="text-[10px] mt-2 opacity-50 truncate lowercase">{key.KeyArn}</p>
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

export default KMSView;
