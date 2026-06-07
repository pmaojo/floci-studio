import { useState, useEffect, useCallback } from 'react';
import { useAws } from '../contexts/AwsContext';
import {
  Tag,
  Search,
  Trash2,
  Plus,
  RefreshCw,
  Layers,
  CheckSquare,
  Square
} from 'lucide-react';
import { PageHeader, Card, Button, Input, Skeleton, Modal } from '../components/ui-elements';
import { sidecarApi } from '../lib/sidecarApi';

interface ResourceTagMapping {
  ResourceARN: string;
  Tags: { Key: string; Value: string }[];
}

export const TagsView = () => {
  const { logActivity } = useAws();

  const [resources, setResources] = useState<ResourceTagMapping[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search state
  const [searchKey, setSearchKey] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [selectedResourceType, setSelectedResourceType] = useState<string>('');

  // Available keys for autocomplete/filtering
  const [availableKeys, setAvailableKeys] = useState<string[]>([]);

  // Selection state
  const [selectedArns, setSelectedArns] = useState<Set<string>>(new Set());

  // Modal state
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [isUntagModalOpen, setIsUntagModalOpen] = useState(false);
  const [bulkTagKey, setBulkTagKey] = useState('');
  const [bulkTagValue, setBulkTagValue] = useState('');
  const [bulkUntagKey, setBulkUntagKey] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchKeys = async () => {
    try {
      const res = await sidecarApi.getTagsKeys();
      if (res.tagKeys) {
        setAvailableKeys(res.tagKeys);
      }
    } catch (e) {
      console.error("Failed to fetch tag keys", e);
    }
  };

  const handleSearch = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSelectedArns(new Set());

    try {
      const tagFilters = [];
      if (searchKey) {
        const filter: any = { Key: searchKey };
        if (searchValue) {
          filter.Values = [searchValue];
        }
        tagFilters.push(filter);
      }

      const resourceTypes = selectedResourceType ? [selectedResourceType] : undefined;

      const res = await sidecarApi.searchResourcesByTags({
        tagFilters: tagFilters.length > 0 ? tagFilters : undefined,
        resourceTypes
      });

      if (res.warning) {
        setError(res.warning);
      }
      setResources(res.resources || []);
      logActivity('resourcegroupstaggingapi', 'GetResources', 'success', `Found ${res.count || 0} resources`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Search failed';
      setError(msg);
      logActivity('resourcegroupstaggingapi', 'GetResources', 'error', msg);
    } finally {
      setLoading(false);
    }
  }, [searchKey, searchValue, selectedResourceType, logActivity]);

  useEffect(() => {
    fetchKeys();
    handleSearch();
  }, [handleSearch]);

  const toggleSelection = (arn: string) => {
    const next = new Set(selectedArns);
    if (next.has(arn)) {
      next.delete(arn);
    } else {
      next.add(arn);
    }
    setSelectedArns(next);
  };

  const toggleAll = () => {
    if (selectedArns.size === resources.length) {
      setSelectedArns(new Set());
    } else {
      setSelectedArns(new Set(resources.map(r => r.ResourceARN)));
    }
  };

  const handleBulkTag = async () => {
    if (!bulkTagKey || selectedArns.size === 0) return;

    setActionLoading(true);
    try {
      const tags = { [bulkTagKey]: bulkTagValue };
      const res = await sidecarApi.tagResources({
        resourceArns: Array.from(selectedArns),
        tags
      });

      if (res.success) {
        logActivity('resourcegroupstaggingapi', 'TagResources', 'success', `Tagged ${res.tagged?.length || 0} resources`);
        setIsTagModalOpen(false);
        setBulkTagKey('');
        setBulkTagValue('');
        handleSearch(); // Refresh
        fetchKeys(); // Refresh keys in case a new one was added
      } else {
        throw new Error(`Failed to tag some resources: ${JSON.stringify(res.failed)}`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to apply tags';
      alert(msg);
      logActivity('resourcegroupstaggingapi', 'TagResources', 'error', msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkUntag = async () => {
    if (!bulkUntagKey || selectedArns.size === 0) return;

    setActionLoading(true);
    try {
      const res = await sidecarApi.untagResources({
        resourceArns: Array.from(selectedArns),
        tagKeys: [bulkUntagKey]
      });

      if (res.success) {
        logActivity('resourcegroupstaggingapi', 'UntagResources', 'success', `Untagged ${res.untagged?.length || 0} resources`);
        setIsUntagModalOpen(false);
        setBulkUntagKey('');
        handleSearch(); // Refresh
      } else {
        throw new Error(`Failed to untag some resources: ${JSON.stringify(res.failed)}`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to remove tags';
      alert(msg);
      logActivity('resourcegroupstaggingapi', 'UntagResources', 'error', msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Pre-defined resource types that might be common
  const commonResourceTypes = [
    'lambda:function',
    's3:bucket',
    'dynamodb:table',
    'sqs:queue',
    'sns:topic',
    'ec2:instance',
    'rds:db'
  ];

  return (
    <div className="flex flex-col h-full bg-brand-bg">
      <PageHeader
        title="Tag Editor"
        icon={Tag as any}
        subtitle="Search and bulk-edit tags across all local AWS resources"
      />

      <div className="p-4 flex-1 flex flex-col min-h-0">
        <Card className="mb-4">
          <div className="p-4 border-b border-brand-text/10 bg-brand-text/5 flex items-center justify-between">
            <h2 className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-2">
              <Search size={14} /> Find Resources
            </h2>
          </div>

          <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase mb-1 opacity-70">Tag Key</label>
              <div className="relative">
                <Input
                  value={searchKey}
                  onChange={(e) => setSearchKey(e.target.value)}
                  placeholder="e.g. env"
                  className="w-full"
                  list="tag-keys-list"
                />
                <datalist id="tag-keys-list">
                  {availableKeys.map(k => <option key={k} value={k} />)}
                </datalist>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase mb-1 opacity-70">Tag Value</label>
              <Input
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="e.g. local (optional)"
                className="w-full"
                disabled={!searchKey}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase mb-1 opacity-70">Resource Type</label>
              <div className="relative">
                <Input
                  value={selectedResourceType}
                  onChange={(e) => setSelectedResourceType(e.target.value)}
                  placeholder="e.g. s3:bucket (optional)"
                  className="w-full"
                  list="resource-types-list"
                />
                <datalist id="resource-types-list">
                  {commonResourceTypes.map(rt => <option key={rt} value={rt} />)}
                </datalist>
              </div>
            </div>

            <div className="flex items-end">
              <Button onClick={() => handleSearch()} disabled={loading} className="w-full">
                {loading ? <RefreshCw size={14} className="animate-spin mr-2" /> : <Search size={14} className="mr-2" />}
                Search
              </Button>
            </div>
          </div>
        </Card>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-mono">
            {error}
          </div>
        )}

        <Card className="flex-1 flex flex-col min-h-0">
          <div className="p-3 border-b border-brand-text flex items-center justify-between bg-brand-text/5">
            <div className="flex items-center gap-4">
              <h3 className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-2">
                <Layers size={14} />
                Results ({resources.length})
              </h3>
              {selectedArns.size > 0 && (
                <span className="text-[10px] font-mono bg-brand-text text-brand-bg px-2 py-0.5 rounded-sm">
                  {selectedArns.size} selected
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={selectedArns.size === 0}
                onClick={() => setIsTagModalOpen(true)}
              >
                <Plus size={12} className="mr-2" /> Add/Edit Tags
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={selectedArns.size === 0}
                onClick={() => setIsUntagModalOpen(true)}
                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
              >
                <Trash2 size={12} className="mr-2" /> Remove Tags
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-auto bg-white">
            {loading ? (
              <div className="p-4 space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : resources.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-brand-text opacity-50 p-8">
                <Search size={32} className="mb-4 opacity-20" />
                <p className="text-sm font-bold uppercase tracking-widest">No Resources Found</p>
                <p className="text-xs mt-2 text-center max-w-md">
                  No resources match the specified tag filters. Ensure resources are tagged or refine your search.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-brand-muted/30 sticky top-0 z-10 border-b border-brand-text/10">
                  <tr>
                    <th className="p-3 w-10 text-center">
                      <button onClick={toggleAll} className="hover:text-brand-green transition-colors">
                        {selectedArns.size === resources.length && resources.length > 0 ? (
                          <CheckSquare size={14} />
                        ) : (
                          <Square size={14} />
                        )}
                      </button>
                    </th>
                    <th className="p-3 font-bold uppercase tracking-wider text-[10px]">Resource ARN</th>
                    <th className="p-3 font-bold uppercase tracking-wider text-[10px]">Tags</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-text/5 font-mono">
                  {resources.map((resource) => {
                    const isSelected = selectedArns.has(resource.ResourceARN);
                    return (
                      <tr
                        key={resource.ResourceARN}
                        className={`hover:bg-brand-muted/10 transition-colors ${isSelected ? 'bg-brand-green/5' : ''}`}
                        onClick={() => toggleSelection(resource.ResourceARN)}
                      >
                        <td className="p-3 text-center cursor-pointer">
                          {isSelected ? (
                            <CheckSquare size={14} className="text-brand-green inline-block" />
                          ) : (
                            <Square size={14} className="opacity-30 inline-block" />
                          )}
                        </td>
                        <td className="p-3">
                          <div className="text-[10px] break-all opacity-80 font-bold">
                            {resource.ResourceARN}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {resource.Tags && resource.Tags.length > 0 ? (
                              resource.Tags.map(tag => (
                                <span
                                  key={tag.Key}
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-brand-text/5 border border-brand-text/10 text-brand-text"
                                >
                                  <span className="font-bold mr-1">{tag.Key}:</span> {tag.Value}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] italic opacity-40">No tags</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>

      {/* Bulk Tag Modal */}
      <Modal
        isOpen={isTagModalOpen}
        onClose={() => !actionLoading && setIsTagModalOpen(false)}
        title="Add/Edit Tags"
      >
        <div className="space-y-4">
          <p className="text-xs opacity-70">
            Applying tag to {selectedArns.size} selected resources. If the key already exists, its value will be overwritten.
          </p>

          <div>
            <label className="block text-[10px] font-bold uppercase mb-1">Key</label>
            <Input
              value={bulkTagKey}
              onChange={(e) => setBulkTagKey(e.target.value)}
              placeholder="e.g. project"
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase mb-1">Value</label>
            <Input
              value={bulkTagValue}
              onChange={(e) => setBulkTagValue(e.target.value)}
              placeholder="e.g. backend"
              className="w-full"
            />
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="secondary" onClick={() => setIsTagModalOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button onClick={handleBulkTag} disabled={!bulkTagKey || actionLoading}>
              {actionLoading ? 'Applying...' : 'Apply Tag'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Untag Modal */}
      <Modal
        isOpen={isUntagModalOpen}
        onClose={() => !actionLoading && setIsUntagModalOpen(false)}
        title="Remove Tags"
      >
        <div className="space-y-4">
          <p className="text-xs opacity-70">
            Removing tag from {selectedArns.size} selected resources.
          </p>

          <div>
            <label className="block text-[10px] font-bold uppercase mb-1">Tag Key to Remove</label>
            <Input
              value={bulkUntagKey}
              onChange={(e) => setBulkUntagKey(e.target.value)}
              placeholder="e.g. project"
              className="w-full"
            />
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="secondary" onClick={() => setIsUntagModalOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkUntag}
              disabled={!bulkUntagKey || actionLoading}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {actionLoading ? 'Removing...' : 'Remove Tag'}
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default TagsView;
