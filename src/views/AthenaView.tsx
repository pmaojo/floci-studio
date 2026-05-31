import { useState, useEffect, useRef } from 'react';
import { 
  sidecarApi 
} from '../lib/sidecarApi';
import { useAws } from '../contexts/AwsContext';
import { 
  Database, 
  Table, 
  Play, 
  History, 
  Terminal, 
  Download, 
  RefreshCw, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  FileSpreadsheet, 
  ChevronRight, 
  ChevronDown,
  LayoutGrid,
  Sparkles,
  ChevronLeft
} from 'lucide-react';
import { PageHeader, Card, Button, Skeleton } from '../components/ui-elements';

const AthenaView = () => {
  const { logActivity } = useAws();
  
  // Tabs: 'workspace' | 'history' | 'catalog'
  const [activeTab, setActiveTab] = useState<'workspace' | 'history' | 'catalog'>('workspace');
  
  // Catalog State
  const [catalog, setCatalog] = useState<any>({ databases: [] });
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [expandedDbs, setExpandedDbs] = useState<Record<string, boolean>>({ 'default': true });
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({});
  
  // Workspace Editor State
  const [selectedDb, setSelectedDb] = useState('default');
  const [queryText, setQueryText] = useState('SELECT * FROM default.web_logs LIMIT 10;');
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null);
  const [activeExecution, setActiveExecution] = useState<any>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  
  // Spreadsheet / Results State
  const [columns, setColumns] = useState<{ name: string; type: string }[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  
  // History State
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Catalog Explorer detail
  const [selectedCatalogDb, setSelectedCatalogDb] = useState<any>(null);
  const [selectedCatalogTable, setSelectedCatalogTable] = useState<any>(null);

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const statusPollRef = useRef<any>(null);

  // Initial loads
  useEffect(() => {
    fetchCatalog();
    fetchHistory();
    return () => {
      if (statusPollRef.current) clearInterval(statusPollRef.current);
    };
  }, []);

  // Sync scroll of line numbers gutter
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  // Keyboard shortcut Ctrl+Enter to execute query
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleExecuteQuery();
    }
  };

  const fetchCatalog = async () => {
    setLoadingCatalog(true);
    try {
      const res = await sidecarApi.getAthenaCatalog();
      if (res.ok && res.catalog) {
        setCatalog(res.catalog);
        if (res.catalog.databases.length > 0) {
          const firstDb = res.catalog.databases[0];
          setSelectedCatalogDb(firstDb);
          if (firstDb.tables.length > 0) {
            setSelectedCatalogTable(firstDb.tables[0]);
          }
        }
      }
      logActivity('Athena', 'List databases and tables from Glue', 'success');
    } catch (err: any) {
      logActivity('Athena', 'Fetch catalog failed', 'error', err.message);
    } finally {
      setLoadingCatalog(false);
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await sidecarApi.getAthenaHistory();
      if (res.ok) {
        setHistory(res.history);
      }
    } catch (err: any) {
      logActivity('Athena', 'Fetch execution history failed', 'error', err.message);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleExecuteQuery = async (overrideQuery?: string) => {
    const code = overrideQuery || queryText;
    if (!code.trim()) return;

    if (statusPollRef.current) clearInterval(statusPollRef.current);
    setIsExecuting(true);
    setQueryError(null);
    setColumns([]);
    setRows([]);
    setCurrentPage(1);

    try {
      const res = await sidecarApi.startAthenaQuery(code, selectedDb);
      if (res.ok && res.queryExecutionId) {
        setCurrentExecutionId(res.queryExecutionId);
        logActivity('Athena', `Query execution started: ${res.queryExecutionId}`, 'success');
        pollQueryStatus(res.queryExecutionId);
      } else {
        throw new Error('Could not start query execution');
      }
    } catch (err: any) {
      setIsExecuting(false);
      setQueryError(err.message || 'Execution failed');
      logActivity('Athena', 'Query submission failed', 'error', err.message);
    }
  };

  const pollQueryStatus = (id: string) => {
    let attempts = 0;
    statusPollRef.current = setInterval(async () => {
      attempts++;
      try {
        const res = await sidecarApi.getAthenaQueryStatus(id);
        if (res.ok && res.execution) {
          setActiveExecution(res.execution);
          
          if (res.execution.status === 'SUCCEEDED') {
            clearInterval(statusPollRef.current);
            setIsExecuting(false);
            
            // Query results
            if (res.execution.results) {
              setColumns(res.execution.results.columns || []);
              setRows(res.execution.results.rows || []);
            }
            fetchHistory(); // refresh logs
          } else if (res.execution.status === 'FAILED') {
            clearInterval(statusPollRef.current);
            setIsExecuting(false);
            setQueryError(res.execution.errorMessage || 'Query failed with standard AWS syntax error');
          }
        }
      } catch (err: any) {
        clearInterval(statusPollRef.current);
        setIsExecuting(false);
        setQueryError(err.message);
      }

      if (attempts > 30) {
        clearInterval(statusPollRef.current);
        setIsExecuting(false);
        setQueryError('Query execution timed out in background polling');
      }
    }, 1000);
  };

  const handleClearHistory = async () => {
    if (!confirm('Clear entire query execution logs?')) return;
    try {
      const res = await sidecarApi.clearAthenaHistory();
      if (res.ok) {
        setHistory([]);
        logActivity('Athena', 'Cleared queries execution history', 'success');
      }
    } catch (err: any) {
      alert(`Failed: ${err.message}`);
    }
  };

  const handleInsertQueryTemplate = (tableName: string) => {
    const template = `SELECT * FROM ${selectedDb}.${tableName} LIMIT 50;`;
    setQueryText(template);
    setActiveTab('workspace');
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const handleLoadHistoryQuery = (query: string) => {
    setQueryText(query);
    setActiveTab('workspace');
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const handleExportCSV = () => {
    if (rows.length === 0) return;
    const headerStr = columns.map(c => `"${c.name}"`).join(',');
    const rowsStr = rows.map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([`${headerStr}\n${rowsStr}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `athena_results_${currentExecutionId || 'export'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleDb = (dbName: string) => {
    setExpandedDbs(prev => ({ ...prev, [dbName]: !prev[dbName] }));
  };

  const toggleTable = (tblName: string) => {
    setExpandedTables(prev => ({ ...prev, [tblName]: !prev[tblName] }));
  };

  // Generate line numbers
  const lineCount = queryText.split('\n').length;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  // Pagination helpers
  const totalPages = Math.ceil(rows.length / rowsPerPage);
  const paginatedRows = rows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCEEDED':
        return (
          <span className="flex items-center gap-1 text-[8px] font-bold border border-emerald-600 bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
            <CheckCircle2 size={10} className="text-emerald-700" /> SUCCEEDED
          </span>
        );
      case 'RUNNING':
        return (
          <span className="flex items-center gap-1 text-[8px] font-bold border border-amber-600 bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded-sm uppercase tracking-wider animate-pulse">
            <RefreshCw size={10} className="text-amber-700 animate-spin" /> RUNNING
          </span>
        );
      case 'QUEUED':
        return (
          <span className="flex items-center gap-1 text-[8px] font-bold border border-neutral-400 bg-neutral-100 text-neutral-700 px-1.5 py-0.5 rounded-sm uppercase tracking-wider animate-pulse">
            <Clock size={10} className="text-neutral-600" /> QUEUED
          </span>
        );
      case 'FAILED':
        return (
          <span className="flex items-center gap-1 text-[8px] font-bold border border-rose-600 bg-rose-50 text-rose-800 px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
            <AlertCircle size={10} className="text-rose-700" /> FAILED
          </span>
        );
      default:
        return (
          <span className="text-[8px] font-bold border border-neutral-300 bg-neutral-50 text-neutral-600 px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col h-full uppercase font-sans">
      <PageHeader 
        title="Athena SQL Workspace" 
        icon={<Terminal size={18} />}
        onRefresh={() => {
          fetchCatalog();
          fetchHistory();
        }}
        isRefreshing={loadingCatalog || loadingHistory}
      />

      {/* Tabs */}
      <div className="flex border-b border-neutral-200 bg-neutral-50/50 px-6 gap-2 shrink-0">
        <button
          onClick={() => setActiveTab('workspace')}
          className={`flex items-center gap-1.5 px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'workspace'
              ? 'border-neutral-900 text-neutral-900 bg-white/40'
              : 'border-transparent text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100/30'
          }`}
        >
          <LayoutGrid size={12} /> Query Workspace
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-1.5 px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'history'
              ? 'border-neutral-900 text-neutral-900 bg-white/40'
              : 'border-transparent text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100/30'
          }`}
        >
          <History size={12} /> Execution History
        </button>
        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex items-center gap-1.5 px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'catalog'
              ? 'border-neutral-900 text-neutral-900 bg-white/40'
              : 'border-transparent text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100/30'
          }`}
        >
          <Database size={12} /> Data Catalogs
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden bg-neutral-50/20">
        {/* WORKSPACE TAB */}
        {activeTab === 'workspace' && (
          <div className="flex h-full min-h-0 overflow-hidden divide-x divide-neutral-200">
            {/* Left Schema Browser Sidebar */}
            <div className="w-64 bg-white flex flex-col shrink-0 min-h-0 overflow-hidden">
              <div className="p-3 border-b border-neutral-150 bg-neutral-50/50 flex items-center justify-between">
                <span className="text-[10px] font-extrabold tracking-wider text-neutral-600 flex items-center gap-1.5">
                  <Database size={12} /> Glue Schema Browser
                </span>
                <Button 
                  variant="secondary" 
                  className="!p-1.5" 
                  onClick={fetchCatalog}
                  title="Reload Schema Catalog"
                >
                  <RefreshCw size={10} className={loadingCatalog ? 'animate-spin' : ''} />
                </Button>
              </div>

              {/* Database Dropdown selector */}
              <div className="p-3 border-b border-neutral-100">
                <select
                  value={selectedDb}
                  onChange={(e) => setSelectedDb(e.target.value)}
                  className="w-full text-[10px] font-bold border border-neutral-250 bg-white px-2 py-1.5 rounded-sm outline-none focus:border-neutral-900 transition-colors"
                >
                  {catalog.databases.map((db: any) => (
                    <option key={db.name} value={db.name}>
                      DATABASE: {db.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tables Tree */}
              <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
                {loadingCatalog ? (
                  <div className="space-y-2 p-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-4/5" />
                  </div>
                ) : catalog.databases.find((d: any) => d.name === selectedDb)?.tables.length === 0 ? (
                  <p className="text-[9px] text-neutral-400 p-2 text-center">No tables discovered in this Glue Database.</p>
                ) : (
                  catalog.databases
                    .find((d: any) => d.name === selectedDb)
                    ?.tables.map((tbl: any) => {
                      const isExpanded = expandedTables[tbl.name];
                      return (
                        <div key={tbl.name} className="border border-neutral-100 rounded-sm bg-neutral-50/20 overflow-hidden">
                          <div 
                            onClick={() => toggleTable(tbl.name)}
                            className="flex items-center justify-between p-2 cursor-pointer hover:bg-neutral-50 transition-colors group"
                          >
                            <span className="text-[9px] font-bold text-neutral-800 flex items-center gap-1">
                              <Table size={10} className="text-neutral-500" />
                              {tbl.name}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleInsertQueryTemplate(tbl.name);
                                }}
                                className="opacity-0 group-hover:opacity-100 text-[8px] font-extrabold uppercase bg-neutral-900 hover:bg-neutral-800 text-white px-1 rounded-sm py-0.5 tracking-wider transition-opacity"
                                title="Click to insert query select template"
                              >
                                Query
                              </button>
                              {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="px-3 py-1.5 bg-white border-t border-neutral-100 space-y-1">
                              <p className="text-[8px] italic text-neutral-400 normal-case mb-1">
                                {tbl.description || 'No Glue description available.'}
                              </p>
                              <div className="space-y-0.5 border-l border-neutral-150 pl-2">
                                {tbl.columns.map((col: any) => (
                                  <div key={col.name} className="flex justify-between items-center text-[8px]">
                                    <span className="font-semibold text-neutral-600 lowercase">{col.name}</span>
                                    <span className="text-neutral-400 font-mono tracking-wider">{col.type}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                )}
              </div>
            </div>

            {/* Right Pane: Query Editor (Top) & Results (Bottom) */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              
              {/* SQL Workspace Query Editor */}
              <div className="h-64 flex flex-col bg-neutral-900 text-neutral-100 shrink-0 relative min-h-0">
                <div className="px-4 py-2 bg-neutral-950 flex justify-between items-center shrink-0 border-b border-neutral-850">
                  <span className="text-[9px] font-extrabold tracking-wider text-neutral-400 flex items-center gap-1">
                    <Sparkles size={11} className="text-neutral-400" /> ACTIVE SQL CONSOLE
                  </span>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-[8px] text-neutral-400">
                      <span className="font-bold border border-neutral-750 px-1 py-0.5 rounded-sm">CTRL+ENTER</span>
                      <span>to run</span>
                    </div>

                    <button
                      onClick={() => handleExecuteQuery()}
                      disabled={isExecuting}
                      className={`flex items-center gap-1.5 text-[9px] font-extrabold tracking-widest uppercase px-3 py-1 rounded-sm transition-all shadow-lg ${
                        isExecuting
                          ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white hover:scale-105 active:scale-95'
                      }`}
                    >
                      {isExecuting ? (
                        <>
                          <RefreshCw size={11} className="animate-spin" /> EXECUTING
                        </>
                      ) : (
                        <>
                          <Play size={11} fill="currentColor" /> RUN QUERY
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Editor textarea with Gutter */}
                <div className="flex-1 flex min-h-0 relative font-mono text-[11px] leading-relaxed">
                  {/* Gutter Line Numbers */}
                  <div 
                    ref={lineNumbersRef}
                    className="w-12 bg-neutral-950 text-neutral-600 text-right pr-3 select-none py-3 overflow-hidden border-r border-neutral-850"
                  >
                    {lineNumbers.map(n => (
                      <div key={n} className="h-[18px]">{n}</div>
                    ))}
                  </div>

                  {/* Monospace Input Area */}
                  <textarea
                    ref={editorRef}
                    value={queryText}
                    onChange={(e) => setQueryText(e.target.value)}
                    onScroll={handleScroll}
                    onKeyDown={handleKeyDown}
                    className="flex-1 bg-transparent text-neutral-200 outline-none resize-none px-4 py-3 leading-[18px] caret-white overflow-y-auto whitespace-pre font-mono font-medium"
                    placeholder="-- Write your SQL query here"
                    spellCheck={false}
                  />
                </div>
              </div>

              {/* Workspace Execution Logs and Results Spreadsheet */}
              <div className="flex-1 min-h-0 flex flex-col bg-white overflow-hidden relative">
                
                {/* Error Banner */}
                {queryError && (
                  <div className="p-3 bg-rose-50 border-b border-rose-100 flex items-start gap-2.5 shrink-0 animate-fadeIn">
                    <AlertCircle size={14} className="text-rose-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-rose-800 uppercase tracking-wider">Athena Query Compile/Runtime Error</p>
                      <pre className="text-[9px] text-rose-700 font-mono leading-relaxed normal-case whitespace-pre-wrap">{queryError}</pre>
                    </div>
                  </div>
                )}

                {/* Running Placeholder State */}
                {isExecuting && (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 bg-neutral-50/30 shrink-0">
                    <RefreshCw size={24} className="text-neutral-400 animate-spin mb-3" />
                    <span className="text-[10px] font-extrabold tracking-widest text-neutral-500 uppercase animate-pulse">
                      Athena query in execution pipeline...
                    </span>
                    <p className="text-[9px] text-neutral-400 normal-case mt-1 max-w-sm text-center">
                      Submitting execution to sidecar. Validating database scopes and resolving Glue table physical layouts.
                    </p>
                  </div>
                )}

                {/* Succeeded Spreadsheet State */}
                {!isExecuting && !queryError && rows.length > 0 && (
                  <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    {/* Metrics Toolbar */}
                    <div className="px-4 py-2 border-b border-neutral-150 bg-neutral-50/50 flex justify-between items-center shrink-0">
                      <div className="flex items-center gap-4 text-[9px] text-neutral-500 font-bold">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 size={11} className="text-emerald-600" /> STATUS: {getStatusBadge('SUCCEEDED')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={11} /> RUNTIME: {activeExecution?.durationMs || 0} MS
                        </span>
                        <span className="flex items-center gap-1">
                          <FileSpreadsheet size={11} /> RECORDS: {rows.length} ROWS
                        </span>
                      </div>

                      <Button 
                        variant="secondary" 
                        className="!px-2.5 !py-1 text-[8px]" 
                        onClick={handleExportCSV}
                      >
                        <Download size={10} /> EXPORT CSV
                      </Button>
                    </div>

                    {/* Premium Spreadsheet Grid */}
                    <div className="flex-1 min-h-0 overflow-auto">
                      <table className="w-full border-collapse text-left text-[9px]">
                        <thead className="bg-neutral-50/80 sticky top-0 z-10 border-b border-neutral-200">
                          <tr>
                            <th className="p-2 border-r border-neutral-150 w-8 text-neutral-400 text-center font-mono">#</th>
                            {columns.map((col, idx) => (
                              <th 
                                key={idx} 
                                className="p-2 border-r border-neutral-150 text-neutral-700 font-extrabold tracking-wider cursor-pointer hover:bg-neutral-150 transition-colors uppercase"
                              >
                                <div className="flex justify-between items-center gap-2">
                                  <span>{col.name}</span>
                                  <span className="text-[7px] text-neutral-400 font-normal lowercase tracking-normal">({col.type})</span>
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-150 font-mono font-medium">
                          {paginatedRows.map((row, rowIdx) => {
                            const absoluteRowIdx = (currentPage - 1) * rowsPerPage + rowIdx + 1;
                            return (
                              <tr key={rowIdx} className="hover:bg-neutral-50/65 transition-colors">
                                <td className="p-2 border-r border-neutral-150 bg-neutral-50/20 text-neutral-400 text-center select-none font-bold">
                                  {absoluteRowIdx}
                                </td>
                                {row.map((cell, cellIdx) => (
                                  <td 
                                    key={cellIdx} 
                                    className="p-2 border-r border-neutral-150 text-neutral-800 select-all normal-case break-all max-w-[200px]"
                                    title="Double click to select/copy"
                                  >
                                    {cell === '' ? <span className="text-neutral-300 select-none font-sans italic">NULL</span> : cell}
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Spreadsheet Pagination footer */}
                    {totalPages > 1 && (
                      <div className="px-4 py-2 border-t border-neutral-250 bg-neutral-50/50 flex justify-between items-center shrink-0">
                        <span className="text-[8px] font-bold text-neutral-500">
                          SHOWING ROWS {((currentPage - 1) * rowsPerPage) + 1} - {Math.min(currentPage * rowsPerPage, rows.length)} OF {rows.length}
                        </span>

                        <div className="flex gap-1">
                          <Button
                            variant="secondary"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            className="!p-1"
                          >
                            <ChevronLeft size={12} />
                          </Button>
                          <span className="text-[9px] font-extrabold border border-neutral-250 bg-white px-3 py-1 rounded-sm flex items-center">
                            PAGE {currentPage} OF {totalPages}
                          </span>
                          <Button
                            variant="secondary"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            className="!p-1"
                          >
                            <ChevronRight size={12} />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Succeeded with NO results */}
                {!isExecuting && !queryError && rows.length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 bg-neutral-50/25 shrink-0 text-center">
                    <FileSpreadsheet size={28} className="text-neutral-300 mb-2" />
                    <span className="text-[10px] font-extrabold tracking-widest text-neutral-500 uppercase">
                      No Records Evaluated
                    </span>
                    <p className="text-[9px] text-neutral-400 normal-case mt-1 max-w-sm">
                      Run a standard `SELECT *` from one of the active Glue catalog tables to explore datasets in real-time.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* EXECUTION HISTORY LOGS TAB */}
        {activeTab === 'history' && (
          <div className="h-full flex flex-col p-6 min-h-0">
            <Card className="flex-1 flex flex-col min-h-0 p-0 overflow-hidden bg-white">
              <div className="p-4 border-b border-neutral-200 bg-neutral-50/50 flex justify-between items-center shrink-0">
                <span className="text-[10px] font-extrabold tracking-wider text-neutral-600 flex items-center gap-1.5">
                  <History size={13} /> Saved SQL Execution Queries Logs
                </span>
                <Button variant="danger" className="text-[8px] font-bold" onClick={handleClearHistory} disabled={history.length === 0}>
                  <Trash2 size={11} /> CLEAR ALL HISTORY
                </Button>
              </div>

              <div className="flex-1 min-h-0 overflow-auto">
                {loadingHistory ? (
                  <div className="space-y-3 p-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : history.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center p-8 shrink-0 text-center">
                    <History size={24} className="text-neutral-300 mb-2" />
                    <span className="text-[9px] font-bold text-neutral-400">NO QUERIES RECORDED IN THIS STATE</span>
                  </div>
                ) : (
                  <table className="w-full text-left text-[9px] border-collapse">
                    <thead className="bg-neutral-50/50 border-b border-neutral-200 font-extrabold text-neutral-700 tracking-wider sticky top-0">
                      <tr>
                        <th className="p-3">STATUS</th>
                        <th className="p-3">QUERY</th>
                        <th className="p-3">DATABASE</th>
                        <th className="p-3">RUNTIME (MS)</th>
                        <th className="p-3">SUBMITTED AT</th>
                        <th className="p-3 text-right">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-150 font-mono font-medium text-neutral-800">
                      {history.map((item) => (
                        <tr key={item.id} className="hover:bg-neutral-50/50 transition-colors">
                          <td className="p-3">{getStatusBadge(item.status)}</td>
                          <td className="p-3 max-w-[280px] truncate normal-case" title={item.query}>
                            {item.query}
                          </td>
                          <td className="p-3">{item.database}</td>
                          <td className="p-3">{item.durationMs ?? '-'}</td>
                          <td className="p-3 normal-case font-sans text-neutral-500">
                            {new Date(item.submittedAt).toLocaleString()}
                          </td>
                          <td className="p-3 text-right space-x-1.5 font-sans">
                            <button
                              onClick={() => handleLoadHistoryQuery(item.query)}
                              className="text-[8px] font-bold border border-neutral-300 hover:border-neutral-900 bg-white hover:bg-neutral-100 text-neutral-700 px-2 py-1 rounded-sm uppercase tracking-wide transition-all"
                            >
                              Load in Editor
                            </button>
                            {item.status === 'SUCCEEDED' && (
                              <button
                                onClick={async () => {
                                  setCurrentExecutionId(item.id);
                                  setQueryError(null);
                                  setIsExecuting(true);
                                  setActiveTab('workspace');
                                  pollQueryStatus(item.id);
                                }}
                                className="text-[8px] font-bold bg-neutral-900 hover:bg-neutral-850 text-white px-2 py-1 rounded-sm uppercase tracking-wide transition-all"
                              >
                                View Results
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* DATA CATALOGS TAB */}
        {activeTab === 'catalog' && (
          <div className="h-full flex min-h-0 overflow-hidden divide-x divide-neutral-200">
            {/* Catalog database tree index */}
            <div className="w-72 bg-white flex flex-col shrink-0 min-h-0 overflow-hidden">
              <div className="p-4 border-b border-neutral-150 bg-neutral-50/50">
                <span className="text-[10px] font-extrabold tracking-wider text-neutral-600 flex items-center gap-1.5">
                  <Database size={13} /> GLUE CATALOG DICTIONARY
                </span>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
                {catalog.databases.map((db: any) => {
                  const isExpanded = expandedDbs[db.name];
                  return (
                    <div key={db.name} className="space-y-1">
                      <div
                        onClick={() => toggleDb(db.name)}
                        className="flex items-center gap-2 p-2 bg-neutral-50 hover:bg-neutral-100 rounded-sm cursor-pointer select-none transition-colors border border-neutral-200"
                      >
                        {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        <Database size={12} className="text-neutral-600" />
                        <span className="text-[10px] font-black text-neutral-700">{db.name}</span>
                      </div>

                      {isExpanded && (
                        <div className="pl-4 space-y-1 py-1 border-l border-dashed border-neutral-250 ml-3">
                          {db.tables.map((t: any) => (
                            <div
                              key={t.name}
                              onClick={() => {
                                setSelectedCatalogDb(db);
                                setSelectedCatalogTable(t);
                              }}
                              className={`flex items-center gap-1.5 p-1.5 rounded-sm cursor-pointer transition-colors border text-[9px] ${
                                selectedCatalogTable?.name === t.name && selectedCatalogDb?.name === db.name
                                  ? 'border-neutral-900 bg-neutral-900 text-white font-bold'
                                  : 'border-transparent hover:bg-neutral-50 text-neutral-600'
                              }`}
                            >
                              <Table size={10} />
                              <span className="truncate">{t.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Table Detail dictionary view */}
            <div className="flex-1 bg-white min-h-0 overflow-y-auto p-6 space-y-6">
              {selectedCatalogTable ? (
                <div className="space-y-6 animate-fadeIn">
                  <div className="flex justify-between items-start border-b border-neutral-200 pb-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-extrabold bg-neutral-150 border border-neutral-300 text-neutral-600 px-1.5 py-0.5 rounded-sm uppercase tracking-widest font-mono">
                          TABLE STRUCTURE
                        </span>
                        <span className="text-[8px] font-extrabold bg-emerald-50 border border-emerald-300 text-emerald-700 px-1.5 py-0.5 rounded-sm uppercase tracking-widest font-mono">
                          ACTIVE GLUE SOURCE
                        </span>
                      </div>
                      <h2 className="text-lg font-black text-neutral-800 tracking-tight lowercase">
                        {selectedCatalogDb?.name}.{selectedCatalogTable.name}
                      </h2>
                      <p className="text-[10px] text-neutral-500 normal-case">
                        {selectedCatalogTable.description || 'No database/table schema annotations provided on disk catalog registries.'}
                      </p>
                    </div>

                    <Button 
                      variant="primary" 
                      className="text-[9px] font-bold" 
                      onClick={() => handleInsertQueryTemplate(selectedCatalogTable.name)}
                    >
                      <Play size={10} fill="currentColor" /> Load Query Template
                    </Button>
                  </div>

                  {/* Metadata fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="bg-neutral-50/50 p-4 border border-neutral-200 rounded-sm">
                      <h4 className="text-[9px] font-black text-neutral-600 mb-2">Location & Formats</h4>
                      <div className="space-y-2 text-[9px] font-mono">
                        <div>
                          <p className="text-neutral-400 font-sans font-bold">PHYSICAL S3 LOCATION</p>
                          <p className="text-neutral-800 lowercase truncate" title={`s3://floci-athena-results-bucket/catalogs/${selectedCatalogDb?.name}/${selectedCatalogTable.name}`}>
                            s3://floci-athena-results-bucket/catalogs/{selectedCatalogDb?.name}/{selectedCatalogTable.name}
                          </p>
                        </div>
                        <div>
                          <p className="text-neutral-400 font-sans font-bold">INPUT FORMAT TYPE</p>
                          <p className="text-neutral-800">org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat</p>
                        </div>
                      </div>
                    </Card>

                    <Card className="bg-neutral-50/50 p-4 border border-neutral-200 rounded-sm">
                      <h4 className="text-[9px] font-black text-neutral-600 mb-2">Glue Summary Schema</h4>
                      <div className="space-y-2 text-[9px] font-mono">
                        <div>
                          <p className="text-neutral-400 font-sans font-bold">DISCOVERED COLUMNS COUNT</p>
                          <p className="text-neutral-800 font-bold">{selectedCatalogTable.columns.length}</p>
                        </div>
                        <div>
                          <p className="text-neutral-400 font-sans font-bold">DATABASE CATALOG REGISTRY</p>
                          <p className="text-neutral-800">AwsGlueDataCatalog</p>
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* Column Schema dictionary */}
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-extrabold tracking-wider text-neutral-600 uppercase">Discovered Columns Mapping</h3>
                    <Card className="p-0 border border-neutral-200 bg-white rounded-sm overflow-hidden">
                      <table className="w-full text-left text-[9px] border-collapse">
                        <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-extrabold tracking-wider">
                          <tr>
                            <th className="p-2.5 pl-4">COLUMN NAME</th>
                            <th className="p-2.5">DATA TYPE</th>
                            <th className="p-2.5">DESCRIPTION & SCHEMAS SOURCE</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-150 font-mono font-medium">
                          {selectedCatalogTable.columns.map((col: any, idx: number) => (
                            <tr key={idx} className="hover:bg-neutral-50/50 transition-colors">
                              <td className="p-2.5 pl-4 font-bold text-neutral-800 lowercase">{col.name}</td>
                              <td className="p-2.5 text-neutral-600 lowercase">{col.type}</td>
                              <td className="p-2.5 text-neutral-400 font-sans normal-case">Discovered dynamically from AWS Glue Catalog schemas mapper.</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </Card>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-8 shrink-0 text-center">
                  <Database size={32} className="text-neutral-300 mb-2" />
                  <span className="text-[10px] font-bold text-neutral-400">SELECT A CATALOG TABLE TO EXPLORE SCHEMAS</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AthenaView;
