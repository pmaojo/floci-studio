import React, { useEffect, useState } from 'react';
import { Tag, Search, Plus, Trash2, Edit3, Loader2 } from 'lucide-react';
import { PageHeader } from '../components/ui-elements';
import { Card } from '../components/ui-elements';
import { Skeleton } from '../components/ui-elements';
import { Button } from '../components/ui-elements';
import { Input } from '../components/ui-elements';
import { sidecarApi, TagResourceMapping } from '../lib/sidecarApi';
import { useAws } from '../contexts/AwsContext';

const TagsView: React.FC = () => {
  const { logActivity } = useAws();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resources, setResources] = useState<TagResourceMapping[]>([]);

  // Tag Keys
  const [tagKeys, setTagKeys] = useState<string[]>([]);
  const [selectedTagKey, setSelectedTagKey] = useState<string>('');

  // Tag Values
  const [tagValues, setTagValues] = useState<string[]>([]);
  const [selectedTagValue, setSelectedTagValue] = useState<string>('');

  // Resource Types
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>('');

  // Bulk Edit State
  const [selectedArns, setSelectedArns] = useState<Set<string>>(new Set());
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);

  // Single Edit State
  const [editingResource, setEditingResource] = useState<TagResourceMapping | null>(null);

  // New Tag State
  const [newTagKey, setNewTagKey] = useState('');
  const [newTagValue, setNewTagValue] = useState('');

  const loadTagKeys = async () => {
    try {
      const res = await sidecarApi.getTagKeys();
      if (res.warning) setError(res.warning);
      setTagKeys(res.tagKeys || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tag keys');
    }
  };

  const loadTagValues = async (key: string) => {
    if (!key) {
      setTagValues([]);
      return;
    }
    try {
      const res = await sidecarApi.getTagValues(key);
      setTagValues(res.values || []);
    } catch (e) {
      console.error("Failed to load tag values", e);
    }
  };

  const loadResources = async () => {
    setLoading(true);
    setError(null);
    try {
      const tagFilters = selectedTagKey ? [{ Key: selectedTagKey, Values: selectedTagValue ? [selectedTagValue] : undefined }] : undefined;
      const resourceTypes = resourceTypeFilter ? [resourceTypeFilter] : undefined;
      const res = await sidecarApi.getResourcesByTags(tagFilters, resourceTypes);
      if (res.warning) setError(res.warning);
      setResources(res.resources || []);
      setSelectedArns(new Set()); // Reset selection on new search
      logActivity('Tags', `Loaded ${res.count || 0} resources`, 'success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to search resources';
      setError(msg);
      logActivity('Tags', msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTagKeys();
    loadResources();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadTagValues(selectedTagKey);
    setSelectedTagValue('');
  }, [selectedTagKey]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadResources();
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedArns(new Set(resources.map(r => r.ResourceARN)));
    } else {
      setSelectedArns(new Set());
    }
  };

  const handleSelectOne = (arn: string, checked: boolean) => {
    const next = new Set(selectedArns);
    if (checked) {
      next.add(arn);
    } else {
      next.delete(arn);
    }
    setSelectedArns(next);
  };

  const handleApplyTags = async (arns: string[], tags: Record<string, string>) => {
    setLoading(true);
    try {
      const res = await sidecarApi.tagResources(arns, tags);
      if (res.success) {
        logActivity('Tags', `Successfully applied tags to ${res.tagged?.length || 0} resources`, 'success');
      } else {
        const errorMsg = Object.values(res.failed)[0] || 'Unknown error';
        logActivity('Tags', `Failed to apply tags: ${errorMsg}`, 'error');
        setError(`Failed: ${errorMsg}`);
      }
      await loadTagKeys();
      await loadResources();
      closeModals();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to apply tags';
      setError(msg);
      logActivity('Tags', msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTags = async (arns: string[], tagKeysToRemove: string[]) => {
    setLoading(true);
    try {
      const res = await sidecarApi.untagResources(arns, tagKeysToRemove);
      if (res.success) {
        logActivity('Tags', `Successfully removed tags from ${res.untagged?.length || 0} resources`, 'success');
      } else {
        const errorMsg = Object.values(res.failed)[0] || 'Unknown error';
        logActivity('Tags', `Failed to remove tags: ${errorMsg}`, 'error');
        setError(`Failed: ${errorMsg}`);
      }
      await loadTagKeys();
      await loadResources();
      closeModals();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to remove tags';
      setError(msg);
      logActivity('Tags', msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const closeModals = () => {
    setIsBulkEditModalOpen(false);
    setEditingResource(null);
    setNewTagKey('');
    setNewTagValue('');
  };

  const renderResourceTable = () => (
    <div className="border border-brand-text/20 overflow-x-auto bg-white/50">
      <table className="w-full text-left text-[10px]">
        <thead className="bg-brand-muted border-b border-brand-text/20">
          <tr>
            <th className="p-3 w-8 text-center">
              <input
                type="checkbox"
                className="accent-brand-text"
                checked={resources.length > 0 && selectedArns.size === resources.length}
                onChange={handleSelectAll}
              />
            </th>
            <th className="p-3">Resource ARN</th>
            <th className="p-3 w-1/3">Tags</th>
            <th className="p-3 w-16 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {resources.length === 0 ? (
            <tr>
              <td colSpan={4} className="p-8 text-center opacity-50 italic normal-case">
                No resources found matching the criteria.
              </td>
            </tr>
          ) : (
            resources.map(resource => (
              <tr key={resource.ResourceARN} className="border-b border-brand-text/10 align-top hover:bg-white/40 transition-colors">
                <td className="p-3 text-center">
                  <input
                    type="checkbox"
                    className="accent-brand-text"
                    checked={selectedArns.has(resource.ResourceARN)}
                    onChange={(e) => handleSelectOne(resource.ResourceARN, e.target.checked)}
                  />
                </td>
                <td className="p-3 font-mono break-all normal-case opacity-90 max-w-sm">
                  {resource.ResourceARN}
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {resource.Tags && resource.Tags.length > 0 ? (
                      resource.Tags.map(tag => (
                        <span key={tag.Key} className="inline-flex items-center text-[9px] font-mono border border-brand-text/30 bg-brand-muted/30 px-1.5 py-0.5 rounded-sm normal-case group">
                          <span className="font-bold opacity-80 mr-1">{tag.Key}:</span>
                          <span className="opacity-90">{tag.Value}</span>
                        </span>
                      ))
                    ) : (
                      <span className="opacity-40 italic normal-case text-[9px]">No tags</span>
                    )}
                  </div>
                </td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => setEditingResource(resource)}
                    className="p-1 hover:bg-brand-muted border border-transparent hover:border-brand-text/30 rounded-sm text-brand-text opacity-70 hover:opacity-100 transition-all"
                    title="Edit Tags"
                  >
                    <Edit3 size={14} />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader
        title="Resource Groups & Tag Editor"
        icon={<Tag size={18} />}
        onRefresh={loadResources}
        isRefreshing={loading}
        actions={
          <Button
            disabled={selectedArns.size === 0}
            onClick={() => setIsBulkEditModalOpen(true)}
            icon={<Edit3 size={14} />}
            variant={selectedArns.size > 0 ? 'primary' : 'secondary'}
          >
            Manage Tags ({selectedArns.size})
          </Button>
        }
      />

      <div className="p-6 flex-1 overflow-auto bg-brand-bg space-y-6">
        <Card className="flex flex-col sm:flex-row gap-4 p-4 border border-brand-text bg-white/40 shadow-sm">
          <form onSubmit={handleSearch} className="flex-1 flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-[9px] font-bold opacity-50 block mb-1">TAG KEY</label>
              <select
                value={selectedTagKey}
                onChange={(e) => setSelectedTagKey(e.target.value)}
                className="w-full border border-brand-text/30 px-3 py-1.5 text-xs bg-white focus:outline-none normal-case font-mono"
              >
                <option value="">-- All Keys --</option>
                {tagKeys.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>

            <div className="flex-1">
              <label className="text-[9px] font-bold opacity-50 block mb-1">TAG VALUE</label>
              <select
                value={selectedTagValue}
                onChange={(e) => setSelectedTagValue(e.target.value)}
                disabled={!selectedTagKey || tagValues.length === 0}
                className="w-full border border-brand-text/30 px-3 py-1.5 text-xs bg-white focus:outline-none normal-case font-mono disabled:opacity-50"
              >
                <option value="">-- All Values --</option>
                {tagValues.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>

            <div className="flex-1">
              <label className="text-[9px] font-bold opacity-50 block mb-1">RESOURCE TYPE</label>
              <Input
                value={resourceTypeFilter}
                onChange={(e) => setResourceTypeFilter(e.target.value)}
                placeholder="e.g. sqs, lambda"
                className="normal-case font-mono text-xs w-full"
              />
            </div>

            <div className="flex items-end shrink-0">
              <Button type="submit" icon={<Search size={14} />} className="w-full sm:w-auto h-8">
                Search Resources
              </Button>
            </div>
          </form>
        </Card>

        {error && (
          <Card className="text-rose-600 font-mono text-[10px] bg-rose-50 border-rose-600 normal-case flex items-center gap-2">
            <span className="font-bold">Error:</span> {error}
          </Card>
        )}

        <div className="space-y-2">
          <div className="flex justify-between items-end px-1">
            <h3 className="text-xs font-bold tracking-widest text-brand-text">Resource Results</h3>
            <span className="text-[10px] font-mono opacity-50">{resources.length} ITEMS</span>
          </div>

          {loading ? (
             <div className="space-y-2">
               {[1,2,3,4].map(i => <Skeleton key={i} className="h-12 w-full" />)}
             </div>
          ) : (
            renderResourceTable()
          )}
        </div>
      </div>

      {/* Edit Single Resource Modal */}
      {editingResource && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-brand-bg border border-brand-text w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl relative">
            <div className="p-4 border-b border-brand-text bg-brand-muted flex justify-between items-center">
              <h3 className="font-bold text-xs tracking-wider flex items-center gap-2">
                <Tag size={16} /> Edit Tags
              </h3>
              <button onClick={closeModals} className="p-1 hover:bg-white/20">×</button>
            </div>

            <div className="p-6 overflow-auto bg-white/50 space-y-6">
              <div>
                <label className="text-[9px] font-bold opacity-50 block mb-1">RESOURCE ARN</label>
                <div className="p-2 border border-brand-text/20 bg-brand-muted/20 font-mono text-[10px] normal-case break-all">
                  {editingResource.ResourceARN}
                </div>
              </div>

              <div>
                <label className="text-[9px] font-bold opacity-50 block mb-2">CURRENT TAGS</label>
                {editingResource.Tags && editingResource.Tags.length > 0 ? (
                  <div className="space-y-2">
                    {editingResource.Tags.map(tag => (
                      <div key={tag.Key} className="flex items-center justify-between p-2 border border-brand-text/20 bg-white shadow-sm">
                        <div className="font-mono text-[11px] normal-case truncate max-w-sm">
                          <span className="font-bold opacity-70 mr-2">{tag.Key}</span>
                          <span className="opacity-90">{tag.Value}</span>
                        </div>
                        <button
                          onClick={() => handleRemoveTags([editingResource.ResourceARN], [tag.Key])}
                          className="text-rose-600 hover:text-rose-800 p-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
                          title="Remove Tag"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 border border-dashed border-brand-text/30 text-center opacity-50 text-[10px] italic normal-case">
                    This resource has no tags.
                  </div>
                )}
              </div>

              <div className="border-t border-brand-text/20 pt-6">
                <label className="text-[10px] font-bold tracking-widest block mb-3 flex items-center gap-2">
                  <Plus size={14} /> ADD NEW TAG
                </label>
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="text-[8px] font-bold opacity-50 block mb-1">KEY</label>
                    <Input
                      value={newTagKey}
                      onChange={(e) => setNewTagKey(e.target.value)}
                      placeholder="e.g. Environment"
                      className="font-mono normal-case text-xs w-full"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[8px] font-bold opacity-50 block mb-1">VALUE</label>
                    <Input
                      value={newTagValue}
                      onChange={(e) => setNewTagValue(e.target.value)}
                      placeholder="e.g. Production"
                      className="font-mono normal-case text-xs w-full"
                    />
                  </div>
                  <Button
                    disabled={!newTagKey || loading}
                    onClick={() => handleApplyTags([editingResource.ResourceARN], { [newTagKey]: newTagValue })}
                    className="h-8"
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : 'Add Tag'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Edit Modal */}
      {isBulkEditModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-brand-bg border border-brand-text w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl relative">
            <div className="p-4 border-b border-brand-text bg-brand-muted flex justify-between items-center">
              <h3 className="font-bold text-xs tracking-wider flex items-center gap-2">
                <Edit3 size={16} /> Manage Tags on Multiple Resources
              </h3>
              <button onClick={closeModals} className="p-1 hover:bg-white/20">×</button>
            </div>

            <div className="p-6 overflow-auto bg-white/50 space-y-6">
              <div>
                <label className="text-[9px] font-bold opacity-50 block mb-1">SELECTED RESOURCES</label>
                <div className="p-3 border border-brand-text/20 bg-brand-muted/20 text-[10px] font-bold">
                  {selectedArns.size} Resources selected
                </div>
              </div>

              <div className="border border-brand-text/20 bg-white p-4">
                <label className="text-[10px] font-bold tracking-widest block mb-3 flex items-center gap-2">
                  <Plus size={14} /> ADD / UPDATE TAG
                </label>
                <p className="text-[9px] normal-case opacity-60 mb-4">This will apply the tag to all selected resources, overwriting the value if the key already exists.</p>

                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="text-[8px] font-bold opacity-50 block mb-1">KEY</label>
                    <Input
                      value={newTagKey}
                      onChange={(e) => setNewTagKey(e.target.value)}
                      placeholder="e.g. Project"
                      className="font-mono normal-case text-xs w-full"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[8px] font-bold opacity-50 block mb-1">VALUE</label>
                    <Input
                      value={newTagValue}
                      onChange={(e) => setNewTagValue(e.target.value)}
                      placeholder="e.g. Alpha"
                      className="font-mono normal-case text-xs w-full"
                    />
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button
                    disabled={!newTagKey || loading}
                    onClick={() => handleApplyTags(Array.from(selectedArns), { [newTagKey]: newTagValue })}
                  >
                    {loading ? <Loader2 size={14} className="animate-spin mr-2" /> : <Plus size={14} className="mr-2"/>}
                    Apply Tag to {selectedArns.size} Resources
                  </Button>
                </div>
              </div>

              <div className="border border-brand-text/20 bg-rose-50/50 p-4 mt-6">
                <label className="text-[10px] font-bold tracking-widest block mb-3 flex items-center gap-2 text-rose-700">
                  <Trash2 size={14} /> REMOVE TAG
                </label>
                <p className="text-[9px] normal-case opacity-60 mb-4 text-rose-900/60">This will remove the specified tag key from all selected resources.</p>

                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="text-[8px] font-bold opacity-50 block mb-1 text-rose-900/60">KEY TO REMOVE</label>
                    <Input
                      value={newTagKey} // Reuse newTagKey input for simplicity
                      onChange={(e) => setNewTagKey(e.target.value)}
                      placeholder="e.g. Project"
                      className="font-mono normal-case text-xs w-full bg-white border-rose-200"
                    />
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button
                    variant="danger"
                    disabled={!newTagKey || loading}
                    onClick={() => handleRemoveTags(Array.from(selectedArns), [newTagKey])}
                  >
                    {loading ? <Loader2 size={14} className="animate-spin mr-2" /> : <Trash2 size={14} className="mr-2"/>}
                    Remove Tag from {selectedArns.size} Resources
                  </Button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TagsView;
