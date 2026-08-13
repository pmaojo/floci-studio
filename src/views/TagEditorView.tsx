import { useState, useEffect, useCallback } from 'react';
import { Tag, Search, Plus, Trash2, AlertCircle, Box } from 'lucide-react';
import { Card, PageHeader, Button, Input, Skeleton } from '../components/ui-elements';
import { sidecarApi } from '../lib/sidecarApi';
import { useAws } from '../contexts/AwsContext';

interface ResourceTagMapping {
  ResourceARN: string;
  Tags: Array<{ Key: string; Value: string }>;
}

export default function TagEditorView() {
  const { logActivity } = useAws();
  const [loading, setLoading] = useState(false);
  const [tagKeys, setTagKeys] = useState<string[]>([]);
  const [resources, setResources] = useState<ResourceTagMapping[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [selectedTagKey, setSelectedTagKey] = useState<string>('');
  const [tagValueInput, setTagValueInput] = useState<string>('');
  const [resourceTypeInput, setResourceTypeInput] = useState<string>('');

  const [selectedArns, setSelectedArns] = useState<Set<string>>(new Set());

  // Bulk edit state
  const [bulkTagKey, setBulkTagKey] = useState('');
  const [bulkTagValue, setBulkTagValue] = useState('');
  const [isBulkEditing, setIsBulkEditing] = useState(false);

  const loadTagKeys = useCallback(async () => {
    try {
      const res = await sidecarApi.getTagKeys();
      setTagKeys(res.tagKeys);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const search = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSelectedArns(new Set());

    try {
      const filters = [];
      if (selectedTagKey) {
        const filter: Record<string, unknown> = { Key: selectedTagKey };
        if (tagValueInput) {
          filter.Values = [tagValueInput];
        }
        filters.push(filter);
      }

      const types = resourceTypeInput ? [resourceTypeInput] : undefined;

      const res = await sidecarApi.searchResources({
        tagFilters: filters.length > 0 ? filters : undefined,
        resourceTypes: types,
      });
      setResources(res.resources || []);
      logActivity('Tags', 'SearchResources', 'success', `Found ${res.count} resources`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Search failed';
      setError(msg);
      logActivity('Tags', 'SearchResources', 'error', msg);
    } finally {
      setLoading(false);
    }
  }, [selectedTagKey, tagValueInput, resourceTypeInput, logActivity]);

  useEffect(() => {
    loadTagKeys();
    search();
  }, [loadTagKeys, search]);

  const toggleSelection = (arn: string) => {
    const next = new Set(selectedArns);
    if (next.has(arn)) next.delete(arn);
    else next.add(arn);
    setSelectedArns(next);
  };

  const selectAll = () => {
    if (selectedArns.size === resources.length) {
      setSelectedArns(new Set());
    } else {
      setSelectedArns(new Set(resources.map(r => r.ResourceARN)));
    }
  };

  const handleBulkTag = async () => {
    if (selectedArns.size === 0 || !bulkTagKey || !bulkTagValue) return;
    setIsBulkEditing(true);
    try {
      const res = await sidecarApi.tagResources(Array.from(selectedArns), { [bulkTagKey]: bulkTagValue });
      if (res.success) {
        logActivity('Tags', 'TagResources', 'success', `Tagged ${res.tagged.length} resources`);
        setBulkTagKey('');
        setBulkTagValue('');
        await search();
        await loadTagKeys();
      } else {
        const firstErr = Object.values(res.failed)[0];
        throw new Error(firstErr || 'Failed to tag some resources');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to tag';
      alert(msg);
      logActivity('Tags', 'TagResources', 'error', msg);
    } finally {
      setIsBulkEditing(false);
    }
  };

  const handleUntag = async (arn: string, key: string) => {
    if (!confirm(`Remove tag '${key}' from resource?`)) return;
    try {
      const res = await sidecarApi.untagResources([arn], [key]);
      if (res.success) {
        logActivity('Tags', 'UntagResource', 'success', `Untagged ${arn}`);
        await search();
        await loadTagKeys();
      } else {
        throw new Error(res.failed[arn] || 'Untag failed');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to untag';
      alert(msg);
      logActivity('Tags', 'UntagResource', 'error', msg);
    }
  };

  const handleBulkUntag = async () => {
     if (selectedArns.size === 0 || !bulkTagKey) return;
     if (!confirm(`Remove tag '${bulkTagKey}' from ${selectedArns.size} resources?`)) return;
     setIsBulkEditing(true);
     try {
       const res = await sidecarApi.untagResources(Array.from(selectedArns), [bulkTagKey]);
       if (res.success) {
         logActivity('Tags', 'UntagResources', 'success', `Untagged ${res.untagged.length} resources`);
         setBulkTagKey('');
         await search();
         await loadTagKeys();
       } else {
         const firstErr = Object.values(res.failed)[0];
         throw new Error(firstErr || 'Failed to untag some resources');
       }
     } catch (err) {
       const msg = err instanceof Error ? err.message : 'Failed to untag';
       alert(msg);
       logActivity('Tags', 'UntagResources', 'error', msg);
     } finally {
       setIsBulkEditing(false);
     }
  };

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader
        title="Global Tag Editor"
        icon={<Tag size={18} />}
        onRefresh={search}
        isRefreshing={loading}
      />

      <div className="p-6 space-y-6 flex-1 overflow-auto bg-brand-bg">
        <Card className="flex flex-col md:flex-row gap-4 p-4 border-brand-text/30 items-end font-mono">
          <div className="flex-1 space-y-1">
             <label className="text-[10px] font-bold opacity-60">Tag Key</label>
             <select
               value={selectedTagKey}
               onChange={e => setSelectedTagKey(e.target.value)}
               className="w-full bg-white border border-brand-text px-3 py-2 text-xs focus:outline-none placeholder:italic"
             >
               <option value="">-- All Tags --</option>
               {tagKeys.map(k => <option key={k} value={k}>{k}</option>)}
             </select>
          </div>

          <div className="flex-1 space-y-1">
             <label className="text-[10px] font-bold opacity-60">Tag Value (Optional)</label>
             <Input
               placeholder="e.g. production"
               value={tagValueInput}
               onChange={e => setTagValueInput(e.target.value)}
               disabled={!selectedTagKey}
             />
          </div>

          <div className="flex-1 space-y-1">
             <label className="text-[10px] font-bold opacity-60">Resource Type (Optional)</label>
             <Input
               placeholder="e.g. ec2:instance"
               value={resourceTypeInput}
               onChange={e => setResourceTypeInput(e.target.value)}
             />
          </div>

          <Button onClick={search} icon={<Search size={14} />} disabled={loading}>
            Search
          </Button>
        </Card>

        {error && (
          <div className="bg-rose-50 text-rose-700 p-4 border border-rose-200 text-xs font-mono flex items-center gap-2 normal-case">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 space-y-4">
            <div className="flex justify-between items-end">
               <h3 className="text-xs font-bold tracking-widest font-mono">
                 Resources Found ({resources.length})
               </h3>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}
              </div>
            ) : resources.length === 0 ? (
              <Card className="text-center py-12 border-dashed bg-brand-muted/20">
                <p className="text-[10px] font-bold tracking-widest opacity-60">NO_RESOURCES_MATCHED</p>
              </Card>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-4 py-2 border-b border-brand-text/10 bg-brand-muted/20 font-mono text-[10px] font-bold">
                  <input
                    type="checkbox"
                    checked={selectedArns.size > 0 && selectedArns.size === resources.length}
                    onChange={selectAll}
                    className="accent-brand-text cursor-pointer w-3 h-3"
                  />
                  <span className="opacity-60">Select All</span>
                </div>

                {resources.map(r => (
                  <Card key={r.ResourceARN} className="p-3 font-mono flex flex-col md:flex-row gap-4 items-start md:items-center">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={selectedArns.has(r.ResourceARN)}
                        onChange={() => toggleSelection(r.ResourceARN)}
                        className="accent-brand-text cursor-pointer w-3 h-3 mt-1 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate normal-case flex items-center gap-2">
                          <Box size={12} className="opacity-40" />
                          {r.ResourceARN.split(':').pop()}
                        </p>
                        <p className="text-[9px] opacity-40 truncate normal-case mt-0.5" title={r.ResourceARN}>
                          {r.ResourceARN}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 shrink-0 justify-end max-w-full">
                      {r.Tags.map(t => (
                        <div key={t.Key} className="flex items-center text-[9px] border border-brand-text/20 bg-brand-muted/30">
                          <span className="px-1.5 py-0.5 border-r border-brand-text/20 font-bold opacity-70">
                            {t.Key}
                          </span>
                          <span className="px-1.5 py-0.5 normal-case">
                            {t.Value}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleUntag(r.ResourceARN, t.Key); }}
                            className="p-1 hover:bg-rose-100 hover:text-rose-700 text-brand-text/40 transition-colors"
                            title="Remove tag"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      ))}
                      {r.Tags.length === 0 && (
                        <span className="text-[9px] opacity-30 italic">Untagged</span>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="w-full lg:w-80 shrink-0 space-y-4">
            <h3 className="text-xs font-bold tracking-widest font-mono">
              Bulk Editor
            </h3>
            <Card className="p-4 space-y-4 font-mono sticky top-6 bg-amber-50/50 border-amber-600/30">
              <div className="text-[9px] flex justify-between items-center opacity-70 border-b border-amber-600/20 pb-2">
                <span>Selected Resources:</span>
                <span className="font-bold text-amber-700 text-xs">{selectedArns.size}</span>
              </div>

              <div className="space-y-1">
                 <label className="text-[10px] font-bold">Tag Key</label>
                 <Input
                   placeholder="e.g. Environment"
                   value={bulkTagKey}
                   onChange={e => setBulkTagKey(e.target.value)}
                 />
              </div>

              <div className="space-y-1">
                 <label className="text-[10px] font-bold">Tag Value</label>
                 <Input
                   placeholder="e.g. Staging"
                   value={bulkTagValue}
                   onChange={e => setBulkTagValue(e.target.value)}
                 />
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <Button
                  onClick={handleBulkTag}
                  disabled={isBulkEditing || selectedArns.size === 0 || !bulkTagKey || !bulkTagValue}
                  className="w-full justify-center"
                  icon={<Plus size={14} />}
                >
                  Apply to Selected
                </Button>
                <Button
                  onClick={handleBulkUntag}
                  disabled={isBulkEditing || selectedArns.size === 0 || !bulkTagKey}
                  variant="secondary"
                  className="w-full justify-center text-rose-700 hover:text-rose-800 hover:border-rose-300 hover:bg-rose-50"
                  icon={<Trash2 size={14} />}
                >
                  Remove from Selected
                </Button>
              </div>
            </Card>
          </div>
        </div>

      </div>
    </div>
  );
}
