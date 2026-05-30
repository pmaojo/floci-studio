import { useState, useEffect, useMemo } from 'react';
import { 
  ListTablesCommand, 
  DescribeTableCommand, 
  ScanCommand, 
  QueryCommand, 
  PutItemCommand, 
  DeleteItemCommand 
} from '@aws-sdk/client-dynamodb';
import { useAws } from '../contexts/AwsContext';
import { 
  Database, 
  Search, 
  Trash2, 
  Edit3, 
  Plus, 
  AlertTriangle, 
  ChevronRight, 
  ChevronLeft, 
  FileJson, 
  Key, 
  Save, 
  Play
} from 'lucide-react';
import { PageHeader, Card, Button, Input, Skeleton, Modal, Select } from '../components/ui-elements';
import { unmarshalItem, marshalItem, marshalValue } from './dynamodbUtils';

// Interface for attribute row in modal form
interface FormAttributeRow {
  name: string;
  type: 'S' | 'N' | 'BOOL' | 'NULL' | 'L' | 'M';
  value: string;
}

const DynamoDBView = () => {
  const { clients, logActivity } = useAws();
  
  // Tables state
  const [tables, setTables] = useState<string[]>([]);
  const [loadingTables, setLoadingTables] = useState(true);
  const [tableSearch, setTableSearch] = useState('');
  
  // Selected Table state
  const [selectedTableName, setSelectedTableName] = useState<string | null>(null);
  const [tableDetails, setTableDetails] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<'items' | 'schema' | 'actions'>('items');
  
  // Items exploration state
  const [items, setItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [itemsError, setItemsError] = useState<string | null>(null);
  
  // Pagination
  const [lastEvaluatedKey, setLastEvaluatedKey] = useState<any | null>(null);
  const [pageHistory, setPageHistory] = useState<any[]>([]); // stack of ExclusiveStartKeys
  const [currentPage, setCurrentPage] = useState(0);
  
  // Query / Scan operation
  const [operationType, setOperationType] = useState<'scan' | 'query'>('scan');
  const [queryPartitionValue, setQueryPartitionValue] = useState('');
  const [querySortValue, setQuerySortValue] = useState('');
  const [querySortOperator, setQuerySortOperator] = useState<'=' | '<' | '>' | 'begins_with'>('=');
  const [clientFilter, setClientFilter] = useState('');
  
  // Item detail modal/drawer
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'form' | 'json'>('json');

  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [formRows, setFormRows] = useState<FormAttributeRow[]>([]);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [isSavingRecord, setIsSavingRecord] = useState(false);

  // Load table list
  const fetchTables = async () => {
    setLoadingTables(true);
    try {
      const res = await clients.dynamo.send(new ListTablesCommand({}));
      setTables(res.TableNames || []);
    } catch (err: any) {
      logActivity('DynamoDB', 'ListTables failed', 'error', err.message);
    } finally {
      setLoadingTables(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  // Fetch Table details (Key Schema, GSIs, description)
  const fetchTableDetails = async (tableName: string) => {
    setLoadingDetails(true);
    setItemsError(null);
    try {
      const res = await clients.dynamo.send(new DescribeTableCommand({ TableName: tableName }));
      setTableDetails(res.Table || null);
      
      // Reset query states
      setQueryPartitionValue('');
      setQuerySortValue('');
      setPageHistory([]);
      setCurrentPage(0);
      setLastEvaluatedKey(null);
      
      // Fetch table items
      fetchItems(tableName, null, 'scan');
    } catch (err: any) {
      setTableDetails(null);
      logActivity('DynamoDB', `DescribeTable ${tableName} failed`, 'error', err.message);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleTableSelect = (tableName: string) => {
    setSelectedTableName(tableName);
    fetchTableDetails(tableName);
  };

  // Extract Partition Key and Sort Key from schemas
  const primaryKeys = useMemo(() => {
    if (!tableDetails?.KeySchema) return { hashKey: '', rangeKey: '' };
    const hash = tableDetails.KeySchema.find((k: any) => k.KeyType === 'HASH');
    const range = tableDetails.KeySchema.find((k: any) => k.KeyType === 'RANGE');
    return {
      hashKey: hash?.AttributeName || '',
      rangeKey: range?.AttributeName || ''
    };
  }, [tableDetails]);

  // Fetch Items via Scan or Query
  const fetchItems = async (
    tableName: string, 
    startKey: any = null, 
    opType: 'scan' | 'query' = operationType
  ) => {
    setLoadingItems(true);
    setItemsError(null);
    try {
      let response;
      const limit = 30;
      
      if (opType === 'query') {
        const { hashKey, rangeKey } = primaryKeys;
        if (!hashKey || !queryPartitionValue) {
          throw new Error('Partition Key value is required for query operations.');
        }

        // Construct ExpressionAttributeValues & ExpressionAttributeNames
        const expressionAttributeNames: Record<string, string> = {
          [`#${hashKey}`]: hashKey
        };
        const expressionAttributeValues: Record<string, any> = {
          [`:${hashKey}`]: marshalValue(queryPartitionValue)
        };
        
        let keyConditionExpression = `#${hashKey} = :${hashKey}`;

        if (rangeKey && querySortValue) {
          expressionAttributeNames[`#${rangeKey}`] = rangeKey;
          expressionAttributeValues[`:${rangeKey}`] = marshalValue(querySortValue);
          
          if (querySortOperator === 'begins_with') {
            keyConditionExpression += ` AND begins_with(#${rangeKey}, :${rangeKey})`;
          } else {
            keyConditionExpression += ` AND #${rangeKey} ${querySortOperator} :${rangeKey}`;
          }
        }

        response = await clients.dynamo.send(new QueryCommand({
          TableName: tableName,
          KeyConditionExpression: keyConditionExpression,
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues,
          Limit: limit,
          ExclusiveStartKey: startKey || undefined
        }));
        
        logActivity('DynamoDB', `Query table ${tableName}`, 'success', `Key: ${queryPartitionValue}`);
      } else {
        // Standard scan
        response = await clients.dynamo.send(new ScanCommand({
          TableName: tableName,
          Limit: limit,
          ExclusiveStartKey: startKey || undefined
        }));
        
        logActivity('DynamoDB', `Scan table ${tableName}`, 'success', `Page ${currentPage + 1}`);
      }

      const rawItems = response.Items || [];
      const jsItems = rawItems.map(item => unmarshalItem(item));
      setItems(jsItems);
      setLastEvaluatedKey(response.LastEvaluatedKey || null);
    } catch (err: any) {
      setItems([]);
      setLastEvaluatedKey(null);
      setItemsError(err.message || 'Operation failed.');
      logActivity('DynamoDB', `Fetch items failed for ${tableName}`, 'error', err.message);
    } finally {
      setLoadingItems(false);
    }
  };

  // Pagination Handlers
  const handleNextPage = () => {
    if (!lastEvaluatedKey || !selectedTableName) return;
    const nextStartKey = lastEvaluatedKey;
    setPageHistory(prev => [...prev, nextStartKey]);
    setCurrentPage(prev => prev + 1);
    fetchItems(selectedTableName, nextStartKey);
  };

  const handlePrevPage = () => {
    if (currentPage === 0 || !selectedTableName) return;
    const newPageHistory = [...pageHistory];
    newPageHistory.pop(); // remove current page start key
    const prevStartKey = newPageHistory[newPageHistory.length - 1] || null;
    
    setPageHistory(newPageHistory);
    setCurrentPage(prev => prev - 1);
    fetchItems(selectedTableName, prevStartKey);
  };

  const executeOperation = () => {
    if (!selectedTableName) return;
    setPageHistory([]);
    setCurrentPage(0);
    setLastEvaluatedKey(null);
    fetchItems(selectedTableName, null, operationType);
  };

  // Auto-discover columns from items
  const columns = useMemo(() => {
    const cols = new Set<string>();
    
    // Ensure primary keys are always the first columns
    const { hashKey, rangeKey } = primaryKeys;
    if (hashKey) cols.add(hashKey);
    if (rangeKey) cols.add(rangeKey);
    
    items.forEach(item => {
      Object.keys(item).forEach(key => cols.add(key));
    });
    
    return Array.from(cols);
  }, [items, primaryKeys]);

  // Client side quick filter
  const filteredItems = useMemo(() => {
    if (!clientFilter) return items;
    const searchLower = clientFilter.toLowerCase();
    return items.filter(item => {
      return Object.values(item).some(val => {
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(searchLower);
      });
    });
  }, [items, clientFilter]);

  // Edit / Create Record logic
  const openEditor = (item: any = null) => {
    setIsNewRecord(item === null);
    setJsonError(null);
    
    if (item === null) {
      // Setup blank item with partition and sort keys initialized
      const { hashKey, rangeKey } = primaryKeys;
      const blank: Record<string, any> = {};
      if (hashKey) blank[hashKey] = '';
      if (rangeKey) blank[rangeKey] = '';
      
      setJsonText(JSON.stringify(blank, null, 2));
      
      // Setup base form rows
      const rows: FormAttributeRow[] = [];
      if (hashKey) rows.push({ name: hashKey, type: 'S', value: '' });
      if (rangeKey) rows.push({ name: rangeKey, type: 'S', value: '' });
      setFormRows(rows);
    } else {
      setJsonText(JSON.stringify(item, null, 2));
      
      // Parse object into form rows
      const rows: FormAttributeRow[] = Object.entries(item).map(([k, v]) => {
        let type: FormAttributeRow['type'] = 'S';
        let stringVal = String(v);
        
        if (v === null) {
          type = 'NULL';
          stringVal = 'null';
        } else if (typeof v === 'boolean') {
          type = 'BOOL';
          stringVal = String(v);
        } else if (typeof v === 'number') {
          type = 'N';
          stringVal = String(v);
        } else if (Array.isArray(v)) {
          type = 'L';
          stringVal = JSON.stringify(v);
        } else if (typeof v === 'object') {
          type = 'M';
          stringVal = JSON.stringify(v);
        }
        
        return { name: k, type, value: stringVal };
      });
      setFormRows(rows);
    }
    
    setIsEditorOpen(true);
  };

  const addFormRow = () => {
    setFormRows(prev => [...prev, { name: '', type: 'S', value: '' }]);
  };

  const removeFormRow = (index: number) => {
    const row = formRows[index];
    const { hashKey, rangeKey } = primaryKeys;
    if (row.name === hashKey || row.name === rangeKey) {
      alert("Cannot delete primary key attribute rows.");
      return;
    }
    setFormRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleFormRowChange = (index: number, field: keyof FormAttributeRow, val: string) => {
    setFormRows(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  // Keep JSON and Form representation synced when switching tabs
  const handleEditorTabSwitch = (mode: 'form' | 'json') => {
    if (mode === 'json' && editorMode === 'form') {
      // Build JSON from form rows
      const obj: Record<string, any> = {};
      formRows.forEach(row => {
        if (!row.name) return;
        let parsedVal: any = row.value;
        if (row.type === 'N') parsedVal = Number(row.value);
        if (row.type === 'BOOL') parsedVal = row.value === 'true';
        if (row.type === 'NULL') parsedVal = null;
        if (row.type === 'L' || row.type === 'M') {
          try {
            parsedVal = JSON.parse(row.value);
          } catch {
            parsedVal = row.value;
          }
        }
        obj[row.name] = parsedVal;
      });
      setJsonText(JSON.stringify(obj, null, 2));
    } else if (mode === 'form' && editorMode === 'json') {
      // Build form rows from JSON
      try {
        const obj = JSON.parse(jsonText);
        const rows: FormAttributeRow[] = Object.entries(obj).map(([k, v]) => {
          let type: FormAttributeRow['type'] = 'S';
          let stringVal = String(v);
          if (v === null) {
            type = 'NULL';
            stringVal = 'null';
          } else if (typeof v === 'boolean') {
            type = 'BOOL';
            stringVal = String(v);
          } else if (typeof v === 'number') {
            type = 'N';
            stringVal = String(v);
          } else if (Array.isArray(v)) {
            type = 'L';
            stringVal = JSON.stringify(v);
          } else if (typeof v === 'object') {
            type = 'M';
            stringVal = JSON.stringify(v);
          }
          return { name: k, type, value: stringVal };
        });
        setFormRows(rows);
        setJsonError(null);
      } catch (err: any) {
        setJsonError(`Invalid JSON: ${err.message}. Resolve errors to switch modes.`);
        return;
      }
    }
    setEditorMode(mode);
  };

  const handleSaveRecord = async () => {
    if (!selectedTableName) return;
    setIsSavingRecord(true);
    setJsonError(null);
    
    try {
      let finalObject: Record<string, any> = {};
      
      if (editorMode === 'json') {
        finalObject = JSON.parse(jsonText);
      } else {
        // Build from form
        formRows.forEach(row => {
          if (!row.name) return;
          let parsedVal: any = row.value;
          if (row.type === 'N') parsedVal = Number(row.value);
          if (row.type === 'BOOL') parsedVal = row.value === 'true';
          if (row.type === 'NULL') parsedVal = null;
          if (row.type === 'L' || row.type === 'M') {
            try {
              parsedVal = JSON.parse(row.value);
            } catch {
              parsedVal = row.value;
            }
          }
          finalObject[row.name] = parsedVal;
        });
      }

      // Quick validate primary keys exist
      const { hashKey, rangeKey } = primaryKeys;
      if (hashKey && (finalObject[hashKey] === undefined || finalObject[hashKey] === '')) {
        throw new Error(`Partition Key '${hashKey}' is required.`);
      }
      if (rangeKey && (finalObject[rangeKey] === undefined || finalObject[rangeKey] === '')) {
        throw new Error(`Sort Key '${rangeKey}' is required.`);
      }

      const marshalled = marshalItem(finalObject);
      
      await clients.dynamo.send(new PutItemCommand({
        TableName: selectedTableName,
        Item: marshalled
      }));

      logActivity('DynamoDB', `PutItem in ${selectedTableName}`, 'success', `${hashKey}: ${finalObject[hashKey]}`);
      setIsEditorOpen(false);
      
      // Refresh items
      fetchItems(selectedTableName, null, operationType);
    } catch (err: any) {
      setJsonError(err.message || 'Failed to save record.');
      logActivity('DynamoDB', `PutItem failed in ${selectedTableName}`, 'error', err.message);
    } finally {
      setIsSavingRecord(false);
    }
  };

  const handleDeleteItem = async (item: any) => {
    if (!selectedTableName) return;
    const { hashKey, rangeKey } = primaryKeys;
    const partitionVal = item[hashKey];
    const sortVal = rangeKey ? item[rangeKey] : null;

    const confirmMsg = rangeKey 
      ? `Are you sure you want to delete item: { ${hashKey}: "${partitionVal}", ${rangeKey}: "${sortVal}" }?`
      : `Are you sure you want to delete item: { ${hashKey}: "${partitionVal}" }?`;

    if (!confirm(confirmMsg)) return;

    try {
      const keyMap: Record<string, any> = {
        [hashKey]: marshalValue(partitionVal)
      };
      if (rangeKey) {
        keyMap[rangeKey] = marshalValue(sortVal);
      }

      await clients.dynamo.send(new DeleteItemCommand({
        TableName: selectedTableName,
        Key: keyMap
      }));

      logActivity('DynamoDB', `DeleteItem from ${selectedTableName}`, 'success', `${hashKey}: ${partitionVal}`);
      
      // Refresh items
      fetchItems(selectedTableName, null, operationType);
    } catch (err: any) {
      alert(`Delete item failed: ${err.message}`);
      logActivity('DynamoDB', `DeleteItem failed in ${selectedTableName}`, 'error', err.message);
    }
  };

  // Truncate table
  const handleTruncateTable = async () => {
    if (!selectedTableName || !confirm(`⚠️ WARNING: This will delete ALL items in table "${selectedTableName}". This action is irreversible. Proceed?`)) return;
    
    setLoadingItems(true);
    try {
      // Scan to fetch all keys
      const { hashKey, rangeKey } = primaryKeys;
      const res = await clients.dynamo.send(new ScanCommand({
        TableName: selectedTableName,
        ProjectionExpression: rangeKey ? `${hashKey}, ${rangeKey}` : hashKey
      }));
      
      const itemsToDelete = res.Items || [];
      if (itemsToDelete.length === 0) {
        alert("Table is already empty.");
        return;
      }

      // Delete items one-by-one (in emulation, fine for standard testing tables)
      for (const rawItem of itemsToDelete) {
        const keyMap: Record<string, any> = {
          [hashKey]: rawItem[hashKey]
        };
        if (rangeKey) {
          keyMap[rangeKey] = rawItem[rangeKey];
        }
        await clients.dynamo.send(new DeleteItemCommand({
          TableName: selectedTableName,
          Key: keyMap
        }));
      }

      logActivity('DynamoDB', `Truncated table ${selectedTableName}`, 'success', `Cleared ${itemsToDelete.length} items`);
      alert(`Cleared ${itemsToDelete.length} items successfully.`);
      fetchItems(selectedTableName, null, 'scan');
    } catch (err: any) {
      alert(`Truncate table failed: ${err.message}`);
      logActivity('DynamoDB', `Truncate failed for ${selectedTableName}`, 'error', err.message);
    } finally {
      setLoadingItems(false);
    }
  };

  // Filtered tables for left sidebar
  const filteredTables = tables.filter(t => t.toLowerCase().includes(tableSearch.toLowerCase()));

  return (
    <div className="flex flex-col h-full uppercase font-sans">
      <PageHeader 
        title="DynamoDB Developer Console" 
        icon={<Database size={18} />}
        onRefresh={fetchTables}
        isRefreshing={loadingTables}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left Table Sidebar */}
        <aside className="w-72 border-r border-brand-text flex flex-col bg-brand-muted shrink-0">
          <div className="p-4 border-b border-brand-text space-y-3 bg-brand-muted/50">
            <h3 className="font-bold text-[10px] tracking-widest text-brand-text opacity-70">Active Tables ({tables.length})</h3>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-brand-text opacity-30" size={13} />
              <Input 
                placeholder="Search tables..." 
                className="pl-8 text-[11px] font-mono"
                value={tableSearch}
                onChange={e => setTableSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loadingTables ? (
              [1, 2, 3].map(i => <Skeleton key={i} className="h-9 w-full" />)
            ) : filteredTables.length === 0 ? (
              <div className="text-[10px] text-center text-brand-text opacity-40 p-6 italic">No tables found</div>
            ) : (
              filteredTables.map(t => (
                <button
                  key={t}
                  onClick={() => handleTableSelect(t)}
                  className={`w-full text-left px-3 py-2 text-[11px] font-mono border transition-all ${
                    selectedTableName === t 
                      ? 'bg-brand-text text-brand-bg border-brand-text font-bold shadow-xs' 
                      : 'border-transparent hover:bg-white/60 hover:border-brand-text/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">{t}</span>
                    <ChevronRight size={10} className={selectedTableName === t ? 'text-brand-bg' : 'opacity-40'} />
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Right workspace panel */}
        <main className="flex-1 flex flex-col bg-brand-bg overflow-hidden relative">
          {!selectedTableName ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-brand-bg/50">
              <div className="w-16 h-16 border border-brand-text/20 flex items-center justify-center text-brand-text/30 mb-4 bg-brand-muted/30">
                <Database size={30} />
              </div>
              <h3 className="font-serif-italic text-lg text-brand-text mb-2">No Table Selected</h3>
              <p className="text-[10px] text-brand-text opacity-50 uppercase max-w-sm tracking-wider">
                Select an active DynamoDB table from the sidebar to inspect items, build search queries, and manage structures.
              </p>
            </div>
          ) : loadingDetails ? (
            <div className="flex-1 p-6 space-y-6">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Header Info Panel */}
              <div className="p-4 border-b border-brand-text bg-brand-muted/40 shrink-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-bold font-mono text-brand-text">{selectedTableName}</h3>
                      <span className="px-2 py-0.5 border border-brand-text/40 text-[9px] font-bold text-brand-text/60 bg-white uppercase">
                        {tableDetails?.TableStatus || 'UNKNOWN'}
                      </span>
                    </div>
                    <div className="flex gap-4 mt-2 text-[9px] font-mono text-brand-text/60">
                      <div>Partition Key: <span className="text-brand-text font-bold uppercase">{primaryKeys.hashKey}</span></div>
                      {primaryKeys.rangeKey && (
                        <div>Sort Key: <span className="text-brand-text font-bold uppercase">{primaryKeys.rangeKey}</span></div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-6 text-[9px] font-bold tracking-widest text-brand-text/70 uppercase">
                    <div>Items: <span className="text-brand-text font-mono text-xs block">{tableDetails?.ItemCount ?? 0}</span></div>
                    <div>Size: <span className="text-brand-text font-mono text-xs block">{(tableDetails?.TableSizeBytes ?? 0).toLocaleString()} B</span></div>
                  </div>
                </div>

                {/* Tabs selection */}
                <div className="flex gap-2 mt-4 border-t border-brand-text/20 pt-3">
                  {(['items', 'schema', 'actions'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider border transition-all ${
                        activeTab === tab
                          ? 'bg-brand-text text-brand-bg border-brand-text'
                          : 'bg-transparent border-transparent hover:bg-brand-muted hover:border-brand-text/20'
                      }`}
                    >
                      {tab === 'items' && 'Items Explorer'}
                      {tab === 'schema' && 'Table Schema'}
                      {tab === 'actions' && 'Table Operations'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Workspace Contents */}
              <div className="flex-1 overflow-hidden flex flex-col">
                {activeTab === 'items' && (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Scan / Query Expression builder */}
                    <div className="p-4 border-b border-brand-text bg-white/70 space-y-4 shrink-0">
                      <div className="flex items-center justify-between border-b border-brand-text/20 pb-2">
                        <div className="flex gap-3 text-[10px] font-bold uppercase">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="radio" 
                              name="opType" 
                              checked={operationType === 'scan'}
                              onChange={() => setOperationType('scan')}
                              className="accent-brand-text"
                            />
                            Scan Table
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="radio" 
                              name="opType"
                              checked={operationType === 'query'}
                              onChange={() => setOperationType('query')}
                              className="accent-brand-text"
                            />
                            Query Index/Keys
                          </label>
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => openEditor()} 
                          icon={<Plus size={12} />}
                        >
                          Create Item
                        </Button>
                      </div>

                      {operationType === 'query' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-brand-muted/30 border border-brand-text/30">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold opacity-60 font-mono lowercase">Partition: {primaryKeys.hashKey} (Exact)</label>
                            <Input 
                              placeholder="Key Value..." 
                              value={queryPartitionValue}
                              onChange={e => setQueryPartitionValue(e.target.value)}
                              className="font-mono"
                            />
                          </div>

                          {primaryKeys.rangeKey ? (
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold opacity-60 font-mono lowercase">Sort Key Operator</label>
                              <Select
                                value={querySortOperator}
                                onChange={e => setQuerySortOperator(e.target.value as any)}
                              >
                                <option value="=">=</option>
                                <option value="<">&lt;</option>
                                <option value=">">&gt;</option>
                                <option value="begins_with">Begins With</option>
                              </Select>
                            </div>
                          ) : <div />}

                          {primaryKeys.rangeKey ? (
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold opacity-60 font-mono lowercase">Sort: {primaryKeys.rangeKey} (Value)</label>
                              <Input 
                                placeholder="Key Value..." 
                                value={querySortValue}
                                onChange={e => setQuerySortValue(e.target.value)}
                                className="font-mono"
                              />
                            </div>
                          ) : <div />}
                        </div>
                      )}

                      {/* Execution triggers */}
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-brand-text opacity-30" size={13} />
                          <Input 
                            placeholder="Quick Filter columns in list (client-side)..." 
                            className="pl-8 text-[11px] font-mono"
                            value={clientFilter}
                            onChange={e => setClientFilter(e.target.value)}
                          />
                        </div>
                        <Button 
                          onClick={executeOperation} 
                          disabled={loadingItems || (operationType === 'query' && !queryPartitionValue)}
                          icon={<Play size={12} />}
                          className="sm:w-40"
                        >
                          {loadingItems ? 'RUNNING...' : 'RUN_QUERY'}
                        </Button>
                      </div>
                    </div>

                    {/* Items table / spreadsheet */}
                    <div className="flex-1 overflow-auto p-4 bg-brand-bg relative">
                      {loadingItems && items.length === 0 ? (
                        <div className="space-y-3">
                          <Skeleton className="h-10 w-full" />
                          <Skeleton className="h-10 w-full" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                      ) : itemsError ? (
                        <Card className="text-rose-600 font-mono text-[10px] border-rose-600 bg-rose-50 p-4">
                          <div className="flex gap-2">
                            <AlertTriangle size={14} className="shrink-0" />
                            <div>
                              <strong className="block font-bold">Query Execution Failed:</strong>
                              <span className="block mt-1 font-mono">{itemsError}</span>
                            </div>
                          </div>
                        </Card>
                      ) : filteredItems.length === 0 ? (
                        <Card className="text-brand-text opacity-30 text-center py-16 italic text-[10px] uppercase font-bold tracking-widest bg-brand-muted/20 border-dashed">
                          No items returned. Select run query or adjust filters.
                        </Card>
                      ) : (
                        <div className="border border-brand-text bg-white overflow-x-auto min-w-full">
                          <table className="min-w-full text-left font-mono text-[10px] border-collapse">
                            <thead>
                              <tr className="bg-brand-muted border-b border-brand-text font-bold uppercase tracking-wider text-brand-text">
                                <th className="p-3 border-r border-brand-text text-center w-20">Actions</th>
                                {columns.map(col => (
                                  <th key={col} className="p-3 border-r border-brand-text last:border-r-0 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                      {(col === primaryKeys.hashKey || col === primaryKeys.rangeKey) && (
                                        <Key size={10} className="text-brand-text shrink-0" />
                                      )}
                                      <span>{col}</span>
                                    </div>
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {filteredItems.map((item, idx) => (
                                <tr key={idx} className="border-b border-brand-text last:border-b-0 hover:bg-brand-muted/20 group">
                                  <td className="p-2 border-r border-brand-text text-center whitespace-nowrap">
                                    <div className="flex items-center justify-center gap-2">
                                      <button 
                                        onClick={() => openEditor(item)}
                                        className="p-1 border border-transparent hover:border-brand-text hover:bg-white text-brand-text rounded-sm transition-all"
                                        title="Edit Item"
                                      >
                                        <Edit3 size={12} />
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteItem(item)}
                                        className="p-1 border border-transparent hover:border-rose-500 hover:bg-rose-50 text-rose-600 rounded-sm transition-all"
                                        title="Delete Item"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </td>
                                  {columns.map(col => {
                                    const rawVal = item[col];
                                    let formatted = '';
                                    let badge = '';

                                    if (rawVal === null || rawVal === undefined) {
                                      formatted = 'NULL';
                                      badge = 'null';
                                    } else if (typeof rawVal === 'boolean') {
                                      formatted = rawVal ? 'TRUE' : 'FALSE';
                                      badge = 'bool';
                                    } else if (typeof rawVal === 'number') {
                                      formatted = String(rawVal);
                                      badge = 'num';
                                    } else if (typeof rawVal === 'object') {
                                      formatted = JSON.stringify(rawVal);
                                      badge = Array.isArray(rawVal) ? 'list' : 'map';
                                    } else {
                                      formatted = String(rawVal);
                                      badge = 'str';
                                    }

                                    return (
                                      <td key={col} className="p-3 border-r border-brand-text last:border-r-0 max-w-xs truncate whitespace-nowrap">
                                        <span className={`text-[8px] font-bold uppercase mr-1.5 px-1 bg-neutral-100 border text-neutral-500`}>
                                          {badge}
                                        </span>
                                        <span className="font-mono text-brand-text" title={formatted}>{formatted}</span>
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Pagination footer */}
                    <div className="p-4 border-t border-brand-text bg-brand-muted/20 flex items-center justify-between shrink-0">
                      <div className="text-[10px] font-bold text-brand-text opacity-60">
                        Page {currentPage + 1} {lastEvaluatedKey ? '(Has more records)' : '(End of table)'}
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          disabled={currentPage === 0 || loadingItems}
                          onClick={handlePrevPage}
                          icon={<ChevronLeft size={12} />}
                        >
                          Prev
                        </Button>
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          disabled={!lastEvaluatedKey || loadingItems}
                          onClick={handleNextPage}
                          icon={<ChevronRight size={12} />}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'schema' && (
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Raw schemas and GSIs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card className="space-y-4">
                        <h4 className="font-bold text-[10px] tracking-widest text-brand-text opacity-70 border-b border-brand-text/20 pb-2">Primary Key Definitions</h4>
                        <div className="space-y-3 font-mono text-[11px]">
                          {tableDetails?.KeySchema?.map((key: any, idx: number) => {
                            const attrDef = tableDetails?.AttributeDefinitions?.find((a: any) => a.AttributeName === key.AttributeName);
                            return (
                              <div key={idx} className="flex justify-between items-center border border-brand-text/20 p-2.5 bg-brand-muted/20">
                                <div>
                                  <span className="font-bold block text-brand-text">{key.AttributeName}</span>
                                  <span className="text-[9px] text-neutral-500 uppercase">{key.KeyType} (Partition/Sort)</span>
                                </div>
                                <span className="px-2 py-0.5 border border-brand-text text-[9px] font-bold bg-white text-neutral-600">
                                  {attrDef?.AttributeType || 'S'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </Card>

                      <Card className="space-y-4">
                        <h4 className="font-bold text-[10px] tracking-widest text-brand-text opacity-70 border-b border-brand-text/20 pb-2">Provisioned Throughput</h4>
                        <div className="space-y-2 font-mono text-[11px]">
                          <div className="flex justify-between p-2 border border-brand-text/10">
                            <span className="opacity-60">Read Capacity Units:</span>
                            <span className="font-bold">{tableDetails?.ProvisionedThroughput?.ReadCapacityUnits ?? 0}</span>
                          </div>
                          <div className="flex justify-between p-2 border border-brand-text/10">
                            <span className="opacity-60">Write Capacity Units:</span>
                            <span className="font-bold">{tableDetails?.ProvisionedThroughput?.WriteCapacityUnits ?? 0}</span>
                          </div>
                          <div className="flex justify-between p-2 border border-brand-text/10">
                            <span className="opacity-60">Billing Mode:</span>
                            <span className="font-bold">{tableDetails?.BillingModeSummary?.BillingMode || 'PROVISIONED'}</span>
                          </div>
                        </div>
                      </Card>
                    </div>

                    {/* Secondary Indexes */}
                    {tableDetails?.GlobalSecondaryIndexes && tableDetails.GlobalSecondaryIndexes.length > 0 && (
                      <Card className="space-y-4">
                        <h4 className="font-bold text-[10px] tracking-widest text-brand-text opacity-70 border-b border-brand-text/20 pb-2">Global Secondary Indexes (GSIs)</h4>
                        <div className="space-y-4 font-mono text-[11px]">
                          {tableDetails.GlobalSecondaryIndexes.map((gsi: any, idx: number) => (
                            <div key={idx} className="border border-brand-text p-4 bg-brand-muted/10 space-y-3">
                              <div className="flex items-center justify-between border-b border-brand-text/20 pb-2">
                                <span className="font-bold font-mono text-xs">{gsi.IndexName}</span>
                                <span className={`px-2 py-0.5 border border-brand-text text-[9px] font-bold uppercase bg-white`}>
                                  {gsi.IndexStatus}
                                </span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <span className="text-[9px] text-neutral-400 uppercase font-bold block">Key Schema</span>
                                  {gsi.KeySchema?.map((k: any, i: number) => (
                                    <div key={i} className="text-[10px]">{k.AttributeName} ({k.KeyType})</div>
                                  ))}
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[9px] text-neutral-400 uppercase font-bold block">Stats & Projection</span>
                                  <div>Projection: {gsi.Projection?.ProjectionType}</div>
                                  <div>Items: {gsi.ItemCount ?? 0}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}

                    {/* Raw JSON Schema inspection */}
                    <Card className="space-y-4">
                      <h4 className="font-bold text-[10px] tracking-widest text-brand-text opacity-70 border-b border-brand-text/20 pb-2 flex items-center gap-2">
                        <FileJson size={14} />
                        Raw Schema JSON
                      </h4>
                      <textarea
                        readOnly
                        className="w-full bg-brand-muted/20 border border-brand-text p-4 font-mono text-[10px] h-64 focus:outline-none scrollbar-hide text-brand-text"
                        value={JSON.stringify(tableDetails, null, 2)}
                      />
                    </Card>
                  </div>
                )}

                {activeTab === 'actions' && (
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-2xl">
                    <Card className="border-rose-600 bg-rose-50/20 space-y-4">
                      <div className="flex items-center gap-2 border-b border-rose-600/20 pb-2 text-rose-800">
                        <AlertTriangle size={18} />
                        <h4 className="font-bold text-[11px] tracking-widest uppercase">Danger Zone</h4>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <span className="font-bold text-[11px] block uppercase text-rose-900">Truncate Table</span>
                            <span className="text-[10px] text-neutral-500 uppercase block mt-1">This will scan the table and perform single DeleteItem operations to empty all database items.</span>
                          </div>
                          <Button 
                            variant="danger" 
                            size="sm" 
                            onClick={handleTruncateTable}
                            className="shrink-0"
                          >
                            Truncate
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Interactive JSON/Form Attribute Editor Modal */}
      <Modal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        title={isNewRecord ? "Create DynamoDB Item" : "Edit DynamoDB Item"}
        className="max-w-2xl"
      >
        <div className="space-y-4 font-sans text-brand-text">
          {/* Modal Header Modes selector */}
          <div className="flex justify-between items-center border-b border-brand-text/20 pb-3">
            <div className="flex gap-2">
              <button
                onClick={() => handleEditorTabSwitch('json')}
                className={`px-3 py-1 text-[9px] font-bold uppercase tracking-wider border transition-all ${
                  editorMode === 'json' ? 'bg-brand-text text-brand-bg border-brand-text' : 'bg-transparent border-transparent hover:bg-brand-muted'
                }`}
              >
                JSON Payload Editor
              </button>
              <button
                onClick={() => handleEditorTabSwitch('form')}
                className={`px-3 py-1 text-[9px] font-bold uppercase tracking-wider border transition-all ${
                  editorMode === 'form' ? 'bg-brand-text text-brand-bg border-brand-text' : 'bg-transparent border-transparent hover:bg-brand-muted'
                }`}
              >
                Key-Value Fields Form
              </button>
            </div>
            <span className="text-[9px] font-mono text-neutral-400">TABLE: {selectedTableName}</span>
          </div>

          {/* Modal body */}
          <div className="overflow-y-auto max-h-[350px] pr-2 scrollbar-hide">
            {editorMode === 'json' ? (
              <div className="space-y-2">
                <label className="text-[9px] font-bold uppercase opacity-60">Raw JSON representation (auto-marshalled)</label>
                <textarea
                  className="w-full bg-white border border-brand-text p-4 font-mono text-[11px] h-60 focus:outline-none"
                  value={jsonText}
                  onChange={e => setJsonText(e.target.value)}
                  placeholder={`{\n  "id": "value"\n}`}
                />
              </div>
            ) : (
              <div className="space-y-3 font-mono">
                <div className="flex items-center gap-4 text-[9px] font-bold text-neutral-400 uppercase border-b border-brand-text/15 pb-2.5">
                  <div className="w-1/3">Attribute Key</div>
                  <div className="w-1/4">Type</div>
                  <div className="flex-1">Value</div>
                  <div className="w-10">Delete</div>
                </div>

                <div className="space-y-2">
                  {formRows.map((row, index) => {
                    const isKey = row.name === primaryKeys.hashKey || row.name === primaryKeys.rangeKey;
                    return (
                      <div key={index} className="flex gap-3 items-center">
                        <div className="w-1/3">
                          <Input 
                            value={row.name}
                            onChange={e => handleFormRowChange(index, 'name', e.target.value)}
                            disabled={isKey && !isNewRecord}
                            placeholder="Attribute name..."
                            className="font-mono text-[10px]"
                          />
                        </div>
                        <div className="w-1/4">
                          <Select
                            value={row.type}
                            onChange={e => handleFormRowChange(index, 'type', e.target.value as any)}
                            disabled={isKey && !isNewRecord}
                            className="font-mono text-[10px]"
                          >
                            <option value="S">String [S]</option>
                            <option value="N">Number [N]</option>
                            <option value="BOOL">Boolean [BOOL]</option>
                            <option value="NULL">Null [NULL]</option>
                            <option value="L">List [L]</option>
                            <option value="M">Map [M]</option>
                          </Select>
                        </div>
                        <div className="flex-1">
                          {row.type === 'BOOL' ? (
                            <Select
                              value={row.value}
                              onChange={e => handleFormRowChange(index, 'value', e.target.value)}
                              className="font-mono text-[10px]"
                            >
                              <option value="true">true</option>
                              <option value="false">false</option>
                            </Select>
                          ) : row.type === 'NULL' ? (
                            <Input 
                              value="null" 
                              disabled 
                              className="font-mono text-[10px] opacity-60" 
                            />
                          ) : (
                            <Input 
                              value={row.value}
                              onChange={e => handleFormRowChange(index, 'value', e.target.value)}
                              placeholder={row.type === 'L' || row.type === 'M' ? '{"key": "val"}' : 'Value...'}
                              className="font-mono text-[10px]"
                            />
                          )}
                        </div>
                        <div className="w-10 flex justify-center">
                          <button
                            type="button"
                            onClick={() => removeFormRow(index)}
                            disabled={isKey}
                            className="p-1 hover:bg-rose-50 border border-transparent hover:border-rose-400 text-rose-500 rounded-xs disabled:opacity-30"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={addFormRow}
                    icon={<Plus size={10} />}
                  >
                    Add Attribute Row
                  </Button>
                </div>
              </div>
            )}
          </div>

          {jsonError && (
            <div className="p-3 border border-rose-500 bg-rose-50 font-mono text-[10px] text-rose-700 flex gap-2">
              <AlertTriangle size={14} className="shrink-0" />
              <span>{jsonError}</span>
            </div>
          )}

          {/* Modal buttons */}
          <div className="flex gap-3 border-t border-brand-text/10 pt-4">
            <Button 
              variant="ghost" 
              className="flex-1" 
              onClick={() => setIsEditorOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1 font-sans" 
              onClick={handleSaveRecord} 
              disabled={isSavingRecord}
              icon={<Save size={12} />}
            >
              {isSavingRecord ? 'SAVING...' : 'SAVE_ITEM'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DynamoDBView;
