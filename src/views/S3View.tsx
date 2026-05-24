import { useState, useEffect, useRef } from 'react';
import { 
  ListBucketsCommand, 
  CreateBucketCommand, 
  DeleteBucketCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  DeleteObjectCommand 
} from '@aws-sdk/client-s3';
import { useAws } from '../contexts/AwsContext';
import { 
  Box, 
  CirclePlus, 
  Trash2, 
  Folder, 
  File, 
  ArrowLeft, 
  Upload, 
  Copy, 
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { PageHeader, Card, Button, Input, Skeleton, Modal } from '../components/ui-elements';

const S3View = () => {
  const { clients, logActivity } = useAws();
  
  // Bucket level state
  const [buckets, setBuckets] = useState<any[]>([]);
  const [loadingBuckets, setLoadingBuckets] = useState(true);
  const [isBucketModalOpen, setIsBucketModalOpen] = useState(false);
  const [newBucketName, setNewBucketName] = useState('');
  const [isCreatingBucket, setIsCreatingBucket] = useState(false);
  
  // Object level state
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [currentPrefix, setCurrentPrefix] = useState<string>(''); // e.g. "images/"
  const [objects, setObjects] = useState<any[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [loadingObjects, setLoadingObjects] = useState(false);
  
  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch all S3 Buckets
  const fetchBuckets = async () => {
    setLoadingBuckets(true);
    try {
      const response = await clients.s3.send(new ListBucketsCommand({}));
      setBuckets(response.Buckets || []);
      logActivity('S3', 'ListBuckets', 'success');
    } catch (err: any) {
      logActivity('S3', 'ListBuckets failed', 'error', err.message);
    } finally {
      setLoadingBuckets(false);
    }
  };

  // Create a new S3 Bucket
  const handleCreateBucket = async () => {
    if (!newBucketName) return;
    setIsCreatingBucket(true);
    try {
      await clients.s3.send(new CreateBucketCommand({ Bucket: newBucketName }));
      logActivity('S3', `CreateBucket: ${newBucketName}`, 'success');
      setNewBucketName('');
      setIsBucketModalOpen(false);
      fetchBuckets();
    } catch (err: any) {
      logActivity('S3', `CreateBucket failed: ${newBucketName}`, 'error', err.message);
      alert(err.message);
    } finally {
      setIsCreatingBucket(false);
    }
  };

  // Delete an empty S3 Bucket
  const handleDeleteBucket = async (bucketName: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Don't trigger bucket selection
    if (!confirm(`Are you sure you want to delete bucket "${bucketName}"?`)) return;
    try {
      await clients.s3.send(new DeleteBucketCommand({ Bucket: bucketName }));
      logActivity('S3', `DeleteBucket: ${bucketName}`, 'success');
      fetchBuckets();
    } catch (err: any) {
      logActivity('S3', `DeleteBucket failed: ${bucketName}`, 'error', err.message);
      alert(`Could not delete bucket: ${err.message}. Make sure the bucket is empty.`);
    }
  };

  // Fetch S3 Objects under current bucket + prefix
  const fetchObjects = async (bucketName: string, prefix: string) => {
    setLoadingObjects(true);
    try {
      const response = await clients.s3.send(new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix,
        Delimiter: '/'
      }));
      
      // Parse sub-directories
      const subdirs = (response.CommonPrefixes || [])
        .map(cp => cp.Prefix!)
        .filter(p => p !== prefix); // Exclude self
      
      // Parse files
      const files = (response.Contents || [])
        .filter(obj => obj.Key !== prefix); // Exclude folder placeholder keys
        
      setFolders(subdirs);
      setObjects(files);
      logActivity('S3', `ListObjects in ${bucketName} (prefix: "${prefix}")`, 'success');
    } catch (err: any) {
      logActivity('S3', `ListObjects failed in ${bucketName}`, 'error', err.message);
    } finally {
      setLoadingObjects(false);
    }
  };

  // Traversal helpers
  const handleSelectBucket = (bucketName: string) => {
    setSelectedBucket(bucketName);
    setCurrentPrefix('');
    fetchObjects(bucketName, '');
  };

  const handleSelectFolder = (folderPrefix: string) => {
    setCurrentPrefix(folderPrefix);
    if (selectedBucket) {
      fetchObjects(selectedBucket, folderPrefix);
    }
  };

  const handleNavigateUp = () => {
    if (!currentPrefix) return;
    
    // Remove the trailing slash and split
    const parts = currentPrefix.replace(/\/$/, '').split('/');
    parts.pop(); // Remove current folder name
    
    const parentPrefix = parts.length > 0 ? parts.join('/') + '/' : '';
    setCurrentPrefix(parentPrefix);
    if (selectedBucket) {
      fetchObjects(selectedBucket, parentPrefix);
    }
  };

  // Upload file to current bucket + prefix
  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedBucket) return;
    
    setIsUploading(true);
    const objectKey = currentPrefix + file.name;
    
    try {
      await clients.s3.send(new PutObjectCommand({
        Bucket: selectedBucket,
        Key: objectKey,
        Body: file,
        ContentType: file.type
      }));
      
      logActivity('S3', `UploadObject: ${objectKey}`, 'success');
      fetchObjects(selectedBucket, currentPrefix);
    } catch (err: any) {
      logActivity('S3', `UploadObject failed: ${objectKey}`, 'error', err.message);
      alert(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Delete an S3 Object
  const handleDeleteObject = async (objectKey: string) => {
    if (!selectedBucket || !confirm(`Delete file "${objectKey}"?`)) return;
    try {
      await clients.s3.send(new DeleteObjectCommand({
        Bucket: selectedBucket,
        Key: objectKey
      }));
      logActivity('S3', `DeleteObject: ${objectKey}`, 'success');
      fetchObjects(selectedBucket, currentPrefix);
    } catch (err: any) {
      logActivity('S3', `DeleteObject failed: ${objectKey}`, 'error', err.message);
      alert(err.message);
    }
  };

  // Copy simulated bucket URL or ARN to clipboard
  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  // Get direct emulated URL for downloads
  const getObjectUrl = (bucketName: string, key: string) => {
    return `http://localhost:4566/${bucketName}/${key}`;
  };

  // Format bytes
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Initial load
  useEffect(() => {
    fetchBuckets();
  }, []);

  return (
    <div className="flex flex-col h-full uppercase">
      {selectedBucket ? (
        <PageHeader 
          title={`S3 Browser: ${selectedBucket}`}
          icon={<Box size={18} />}
          onRefresh={() => fetchObjects(selectedBucket, currentPrefix)}
          isRefreshing={loadingObjects}
          actions={
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setSelectedBucket(null)} icon={<ArrowLeft size={14} />}>
                Back to Buckets
              </Button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleUploadFile} 
                className="hidden" 
              />
              <Button 
                onClick={() => fileInputRef.current?.click()} 
                disabled={isUploading}
                icon={<Upload size={14} />}
              >
                {isUploading ? 'Uploading...' : 'Upload File'}
              </Button>
            </div>
          }
        />
      ) : (
        <PageHeader 
          title="S3 Object Storage" 
          icon={<Box size={18} />}
          onRefresh={fetchBuckets}
          isRefreshing={loadingBuckets}
          actions={
            <Button onClick={() => setIsBucketModalOpen(true)} icon={<CirclePlus size={14} />}>
              Create Bucket
            </Button>
          }
        />
      )}

      {/* Creation Modal */}
      <Modal 
        isOpen={isBucketModalOpen} 
        onClose={() => setIsBucketModalOpen(false)} 
        title="Create S3 Bucket"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Bucket Name (lowercase only)</label>
            <Input 
              value={newBucketName}
              onChange={e => setNewBucketName(e.target.value.toLowerCase())}
              placeholder="my-static-assets"
              autoFocus
            />
          </div>
          <div className="pt-4 flex gap-3">
             <Button variant="ghost" className="flex-1" onClick={() => setIsBucketModalOpen(false)}>Cancel</Button>
             <Button className="flex-1" onClick={handleCreateBucket} disabled={!newBucketName || isCreatingBucket}>
               {isCreatingBucket ? 'Creating...' : 'Create'}
             </Button>
          </div>
        </div>
      </Modal>

      <div className="p-6 flex-1 overflow-auto bg-brand-bg">
        {!selectedBucket ? (
          /* BUCKET LIST VIEW */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loadingBuckets ? (
              [1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)
            ) : buckets.length === 0 ? (
              <div className="col-span-full py-20 text-center border border-dashed border-brand-text/20">
                 <p className="text-xs opacity-40 font-mono italic">NO_S3_BUCKETS_FOUND</p>
              </div>
            ) : (
              buckets.map(bucket => (
                <Card
                  key={bucket.Name}
                  className="hover:border-brand-text transition-all bg-white flex flex-col justify-between h-36 relative group"
                >
                  {/* Full-surface click target for navigation */}
                  <button
                    className="absolute inset-0 w-full h-full cursor-pointer z-0"
                    onClick={() => handleSelectBucket(bucket.Name!)}
                    aria-label={`Open bucket ${bucket.Name}`}
                  />
                  <div className="relative z-10 flex justify-between items-start pointer-events-none">
                    <div className="p-2.5 bg-brand-muted border border-brand-text shrink-0">
                      <Box size={22} className="text-brand-text" />
                    </div>
                    {/* Delete button must be above the navigation layer */}
                    <button
                      onClick={(e) => handleDeleteBucket(bucket.Name!, e)}
                      className="p-1 hover:text-rose-600 transition-colors border border-transparent hover:border-brand-text/10 pointer-events-auto"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="relative z-10 mt-3 pointer-events-none">
                    <h4 className="font-bold text-xs truncate normal-case tracking-wide text-brand-text">{bucket.Name}</h4>
                    <p className="text-[8px] font-mono opacity-40 mt-1">CREATED: {bucket.CreationDate ? new Date(bucket.CreationDate).toLocaleString() : 'N/A'}</p>
                    <p className="text-[8px] font-mono opacity-20 mt-0.5 flex items-center gap-1"><ChevronRight size={9} /> Click to browse objects</p>
                  </div>
                </Card>
              ))
            )}
          </div>
        ) : (
          /* OBJECT BROWSER VIEW */
          <div className="space-y-4">
            {/* Folder Breadcrumbs */}
            <div className="flex items-center gap-1.5 p-3 bg-white border border-brand-text font-mono text-[10px] tracking-wider shrink-0 select-none">
              <span 
                className="cursor-pointer font-bold hover:underline text-brand-text"
                onClick={() => handleSelectFolder('')}
              >
                ROOT
              </span>
              {currentPrefix.split('/').filter(Boolean).map((folder, idx, arr) => {
                const prefix = arr.slice(0, idx + 1).join('/') + '/';
                return (
                  <div key={folder} className="flex items-center gap-1.5">
                    <ChevronRight size={10} className="opacity-40" />
                    <span 
                      className="cursor-pointer font-bold hover:underline text-brand-text last:font-normal last:no-underline"
                      onClick={() => handleSelectFolder(prefix)}
                    >
                      {folder}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Browser Table Card */}
            <Card className="font-mono p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[10px] align-middle">
                  <thead className="bg-brand-muted border-b border-brand-text">
                    <tr>
                      <th className="p-3 w-1/2">Name</th>
                      <th className="p-3">Size</th>
                      <th className="p-3">Last Modified</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Navigation Up Row */}
                    {currentPrefix && (
                      <tr 
                        className="border-b border-brand-text/10 hover:bg-neutral-50 cursor-pointer"
                        onClick={handleNavigateUp}
                      >
                        <td className="p-3 flex items-center gap-2.5 font-bold" colSpan={4}>
                          <ArrowLeft size={14} className="opacity-60" />
                          <span>.. (Go Up)</span>
                        </td>
                      </tr>
                    )}

                    {/* Folders */}
                    {folders.map(folder => {
                      const name = folder.replace(currentPrefix, '').replace(/\/$/, '');
                      return (
                        <tr 
                          key={folder} 
                          className="border-b border-brand-text/10 hover:bg-neutral-50 cursor-pointer align-middle"
                          onClick={() => handleSelectFolder(folder)}
                        >
                          <td className="p-3 font-bold">
                            <div className="flex items-center gap-2.5">
                              <Folder size={14} className="text-amber-500 fill-amber-500" />
                              <span className="normal-case">{name}</span>
                            </div>
                          </td>
                          <td className="p-3 opacity-40">FOLDER</td>
                          <td className="p-3 opacity-40">—</td>
                          <td className="p-3 text-right">
                            <span className="text-[8px] border border-brand-text/15 bg-brand-muted/50 px-1.5 py-0.5">DIRECTORY</span>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Files */}
                    {objects.map(obj => {
                      const name = obj.Key!.replace(currentPrefix, '');
                      return (
                        <tr key={obj.Key} className="border-b border-brand-text/10 hover:bg-neutral-50 align-middle">
                          <td className="p-3 font-semibold text-brand-text">
                            <div className="flex items-center gap-2.5">
                              <File size={14} className="text-neutral-500" />
                              <span className="normal-case truncate max-w-md">{name}</span>
                            </div>
                          </td>
                          <td className="p-3 text-neutral-600">{formatBytes(obj.Size)}</td>
                          <td className="p-3 text-neutral-500">{new Date(obj.LastModified).toLocaleString()}</td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button 
                                onClick={() => handleCopyText(`s3://${selectedBucket}/${obj.Key}`)}
                                title="Copy S3 URI"
                                className="p-1.5 border border-brand-text/10 hover:bg-brand-muted hover:border-brand-text transition-all"
                              >
                                <Copy size={12} />
                              </button>
                              <a 
                                href={getObjectUrl(selectedBucket, obj.Key!)}
                                target="_blank"
                                rel="noreferrer"
                                title="Download / Open Direct"
                                className="p-1.5 border border-brand-text/10 hover:bg-brand-muted hover:border-brand-text transition-all flex items-center justify-center text-brand-text"
                              >
                                <ExternalLink size={12} />
                              </a>
                              <button 
                                onClick={() => handleDeleteObject(obj.Key!)}
                                title="Delete File"
                                className="p-1.5 border border-transparent hover:border-rose-600/20 hover:bg-rose-50 text-rose-600 transition-all"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Empty Directory Notification */}
                    {folders.length === 0 && objects.length === 0 && (
                      <tr>
                        <td className="p-8 text-center text-xs opacity-40 italic" colSpan={4}>
                          DIRECTORY_IS_EMPTY
                        </td>
                      </tr>
                    )}
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

export default S3View;
