import React, { useState, useEffect } from 'react';
import { GetRestApisCommand, CreateRestApiCommand, DeleteRestApiCommand } from '@aws-sdk/client-api-gateway';
import { useAws } from '../contexts/AwsContext';
import { Globe, Search, CirclePlus, Trash2, ExternalLink, Zap, Settings, Send, MessageSquare, Terminal } from 'lucide-react';
import { PageHeader, Card, Button, Input, Skeleton, Modal, Select } from '../components/ui-elements';
import { motion, AnimatePresence } from 'motion/react';

interface WebSocketApi {
  id: string;
  name: string;
  routeSelectionExpression: string;
  endpointUrl: string;
  routes: string[]; // e.g., ['$connect', '$disconnect', '$default', 'sendMessage']
  mockResponses: Record<string, string>; // route -> string response
}

const ApiGatewayView = () => {
  const { clients, logActivity } = useAws();
  const [activeTab, setActiveTab] = useState<'rest' | 'ws'>('rest');
  const [apis, setApis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // REST Modals
  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);
  const [newApiName, setNewApiName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // WebSocket APIs State
  const [wsApis, setWsApis] = useState<WebSocketApi[]>(() => {
    const saved = localStorage.getItem('aws-sim-apigw-websockets');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      {
        id: "ws-api-01",
        name: "EnterpriseNotificationSocket",
        routeSelectionExpression: "$request.body.action",
        endpointUrl: "wss://api-gateway.floci.internal/notification-feed",
        routes: ["$connect", "$disconnect", "$default", "broadcastMessage"],
        mockResponses: {
          "$connect": '{"statusCode": 200, "message": "Connection established successfully to floci-ws-daemon"}',
          "$default": '{"statusCode": 400, "error": "Action routing directive not found"}',
          "broadcastMessage": '{"event": "message_delivered", "timestamp": "1716157200"}'
        }
      }
    ];
  });

  const [isWsModalOpen, setIsWsModalOpen] = useState(false);
  const [wsName, setWsName] = useState('');
  const [wsRouteExpr, setWsRouteExpr] = useState('$request.body.action');
  
  // Interactive Live Socket Simulator
  const [selectedWsId, setSelectedWsId] = useState<string | null>(null);
  const [currentRouteTest, setCurrentRouteTest] = useState('$connect');
  const [testPayload, setTestPayload] = useState('{"action": "broadcastMessage", "user": "test-admin"}');
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);

  useEffect(() => {
    localStorage.setItem('aws-sim-apigw-websockets', JSON.stringify(wsApis));
  }, [wsApis]);

  const fetchApis = async () => {
    setLoading(true);
    try {
      const response = await clients.apigateway.send(new GetRestApisCommand({}));
      setApis(response.items || []);
      logActivity('APIGateway', 'GetRestApis', 'success');
    } catch (err: any) {
      logActivity('APIGateway', 'GetRestApis failed', 'error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApi = async () => {
    if (!newApiName) return;
    setIsCreating(true);
    try {
      await clients.apigateway.send(new CreateRestApiCommand({ 
        name: newApiName,
        description: 'Created via Floci UI'
      }));
      logActivity('APIGateway', `CreateRestApi: ${newApiName}`, 'success');
      setNewApiName('');
      setIsCreationModalOpen(false);
      fetchApis();
    } catch (err: any) {
      logActivity('APIGateway', `CreateRestApi failed: ${newApiName}`, 'error', err.message);
      alert(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteApi = async (apiId: string, name: string) => {
    if (!confirm(`Delete API ${name}?`)) return;
    try {
      await clients.apigateway.send(new DeleteRestApiCommand({ restApiId: apiId }));
      logActivity('APIGateway', `DeleteRestApi: ${name}`, 'success');
      fetchApis();
    } catch (err: any) {
      logActivity('APIGateway', `DeleteRestApi failed: ${name}`, 'error', err.message);
      alert(err.message);
    }
  };

  const handleCreateWs = () => {
    if (!wsName) return;
    const newWs: WebSocketApi = {
      id: `ws-${Math.random().toString(36).substring(5)}`,
      name: wsName,
      routeSelectionExpression: wsRouteExpr,
      endpointUrl: `wss://gateway.${wsName.toLowerCase()}.floci.internal/livedata`,
      routes: ['$connect', '$disconnect', '$default'],
      mockResponses: {
        '$connect': '{"status": "connected"}',
        '$default': '{"error": "route_not_found"}'
      }
    };
    setWsApis(prev => [...prev, newWs]);
    logActivity('APIGatewayWS', `CreateWebSocketApi: ${wsName}`, 'success');
    setIsWsModalOpen(false);
    setWsName('');
  };

  const handleDeleteWs = (id: string, name: string) => {
    if (!confirm(`Delete WebSocket API ${name}?`)) return;
    setWsApis(prev => prev.filter(api => api.id !== id));
    logActivity('APIGatewayWS', `DeleteWebSocketApi: ${name}`, 'success');
    if (selectedWsId === id) setSelectedWsId(null);
  };

  const handleSimulateMessage = () => {
    const ws = wsApis.find(a => a.id === selectedWsId);
    if (!ws) return;
    
    let simulatedResponse = ws.mockResponses[currentRouteTest] || ws.mockResponses['$default'];
    
    setTerminalLogs(prev => [
      ...prev,
      `[CLIENT -> SOCKET] trigger event bound [${currentRouteTest}] with body: ${testPayload}`,
      `[ROUTING EXPR ENGINE] evaluate Route: ${ws.routeSelectionExpression}`,
      `[SERVER RESPONSE] ${simulatedResponse}`
    ]);
    
    logActivity('APIGatewayWS', `SimulateRoute: ${ws.name} @ ${currentRouteTest}`, 'success');
  };

  useEffect(() => {
    fetchApis();
  }, []);

  const filteredApis = apis.filter(api => 
    api.name?.toLowerCase().includes(search.toLowerCase()) ||
    api.id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader 
        title="API Gateway Integration" 
        icon={<Globe size={18} />}
        onRefresh={activeTab === 'rest' ? fetchApis : () => {}}
        isRefreshing={loading && activeTab === 'rest'}
        actions={
          activeTab === 'rest' ? (
            <Button onClick={() => setIsCreationModalOpen(true)} icon={<CirclePlus size={14} />}>
              New REST API
            </Button>
          ) : (
            <Button onClick={() => setIsWsModalOpen(true)} icon={<CirclePlus size={14} />}>
              New WebSocket API
            </Button>
          )
        }
      />

      <div className="flex border-b border-brand-text bg-brand-muted shrink-0 text-xs font-bold leading-none">
        <button 
          onClick={() => setActiveTab('rest')}
          className={`px-6 py-3 border-r border-brand-text flex items-center gap-2 transition-all ${activeTab === 'rest' ? 'bg-white border-b-2 border-b-transparent' : 'opacity-60 hover:opacity-100'}`}
        >
          <Zap size={14} />
          REST Protocols ({apis.length})
        </button>
        <button 
          onClick={() => setActiveTab('ws')}
          className={`px-6 py-3 border-r border-brand-text flex items-center gap-2 transition-all ${activeTab === 'ws' ? 'bg-white border-b-2 border-b-transparent' : 'opacity-60 hover:opacity-100'}`}
        >
          <MessageSquare size={14} />
          WebSockets ({wsApis.length})
        </button>
      </div>

      <Modal 
        isOpen={isCreationModalOpen} 
        onClose={() => setIsCreationModalOpen(false)} 
        title="Create REST API"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">API Name</label>
            <Input 
              value={newApiName}
              onChange={e => setNewApiName(e.target.value)}
              placeholder="MyAwesomeAPI"
              autoFocus
            />
          </div>
          <div className="pt-4 flex gap-3">
             <Button variant="ghost" className="flex-1" onClick={() => setIsCreationModalOpen(false)}>Cancel</Button>
             <Button className="flex-1" onClick={handleCreateApi} disabled={!newApiName || isCreating}>
               {isCreating ? 'Creating...' : 'Create API'}
             </Button>
          </div>
        </div>
      </Modal>

      {/* WebSocket creation modular view */}
      <Modal isOpen={isWsModalOpen} onClose={() => setIsWsModalOpen(false)} title="Create WebSocket Stream API">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">WebSocket API Name</label>
            <Input value={wsName} onChange={e => setWsName(e.target.value)} placeholder="LiveTradeFeed" autoFocus />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Route Selection Evaluation Expression</label>
            <Input value={wsRouteExpr} onChange={e => setWsRouteExpr(e.target.value)} placeholder="$request.body.action" />
          </div>
          <div className="pt-4 flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setIsWsModalOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleCreateWs} disabled={!wsName}>Activate WebSocket</Button>
          </div>
        </div>
      </Modal>

      <div className="p-6 space-y-6 flex-1 overflow-auto bg-brand-bg">
        {activeTab === 'rest' ? (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text opacity-30" size={14} />
              <input 
                type="text"
                placeholder="Search Endpoints..."
                className="w-full bg-white border border-brand-text pl-10 pr-4 py-2 text-xs focus:outline-none placeholder:italic"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {loading ? (
                [1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)
              ) : filteredApis.length === 0 ? (
                <div className="col-span-full py-20 text-center border-2 border-dashed border-brand-text/10 rounded-sm">
                   <p className="text-xs opacity-40 font-mono tracking-widest italic">NO_GATEWAYS_ACTIVE</p>
                </div>
              ) : (
                filteredApis.map(api => (
                  <Card key={api.id} className="group hover:border-brand-text transition-all bg-white">
                    <div className="flex justify-between items-start mb-3">
                      <div className="p-2 bg-brand-muted border border-brand-text shrink-0">
                        <Zap size={16} />
                      </div>
                      <div className="flex gap-1">
                        <button className="p-1 hover:bg-brand-muted"><Settings size={14} /></button>
                        <button onClick={() => handleDeleteApi(api.id!, api.name!)} className="p-1 hover:text-rose-500"><Trash2 size={14} /></button>
                      </div>
                    </div>
                    <h4 className="font-bold text-xs truncate mb-1">{api.name}</h4>
                    <p className="text-[10px] font-mono opacity-50 truncate">{api.id}</p>
                    <div className="mt-4 flex items-center justify-between text-[9px] font-bold opacity-40">
                      <span className="flex items-center gap-1"><Globe size={10} /> REGIONAL</span>
                      <span className="bg-black text-white px-1.5 py-0.5 rounded-xs">ACTIVE</span>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* WebSocket List */}
            <div className="lg:col-span-2 space-y-4">
              {wsApis.length === 0 ? (
                <div className="py-20 text-center border border-dashed border-brand-text/20">
                  <p className="text-xs opacity-40 font-mono italic">NO_WEBSOCKETS_ACTIVE</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {wsApis.map(api => (
                    <Card 
                      key={api.id} 
                      onClick={() => setSelectedWsId(api.id)}
                      className={`group hover:border-brand-text transition-all cursor-pointer bg-white ${selectedWsId === api.id ? 'border-brand-text ring-1 ring-brand-text' : ''}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex gap-3">
                          <div className="p-2 bg-brand-muted border border-brand-hover hover:border-brand-text shrink-0">
                            <MessageSquare size={16} />
                          </div>
                          <div>
                            <h4 className="font-bold text-xs truncate leading-tight font-mono">{api.name}</h4>
                            <p className="text-[9px] font-mono opacity-40 truncate leading-none mt-1 lowercase">{api.endpointUrl}</p>
                          </div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteWs(api.id, api.name); }} className="p-1 hover:text-rose-500 shrink-0"><Trash2 size={14} /></button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-4 text-[9px] font-mono opacity-60">
                        <div className="p-1 bg-brand-muted border border-brand-text/5">
                          <p className="font-bold opacity-40 uppercase">ROUTING EXPRESSION</p>
                          <p className="truncate lowercase">{api.routeSelectionExpression}</p>
                        </div>
                        <div className="p-1 bg-brand-muted border border-brand-text/5">
                          <p className="font-bold opacity-40 uppercase">DEFINED_ROUTES</p>
                          <p>{api.routes.length} Active</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Simulated terminal playground sidepanel */}
            <div className="space-y-6">
              {selectedWsId ? (
                (() => {
                  const activeWs = wsApis.find(a => a.id === selectedWsId);
                  if (!activeWs) return null;
                  return (
                    <Card secondary className="bg-white border-brand-text">
                      <h4 className="font-bold text-[10px] mb-4 tracking-widest border-b border-brand-text/10 pb-2">SOCKET_SIMULATOR_V2</h4>
                      <div className="space-y-3 font-mono text-[10px]">
                        <div>
                          <label className="text-[8px] font-sans font-bold uppercase opacity-50">Select Router Action Event Target</label>
                          <Select value={currentRouteTest} onChange={e => setCurrentRouteTest(e.target.value)}>
                            {activeWs.routes.map(r => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </Select>
                        </div>

                        <div>
                          <label className="text-[8px] font-sans font-bold uppercase opacity-50">Event Body Payload</label>
                          <textarea 
                            value={testPayload}
                            onChange={e => setTestPayload(e.target.value)}
                            className="w-full h-20 bg-brand-muted/10 border font-mono text-[9px] p-2 focus:outline-none"
                          />
                        </div>

                        <Button size="sm" onClick={handleSimulateMessage} className="w-full" icon={<Send size={10} />}>
                          Trigger Frame Send
                        </Button>

                        <div className="pt-2">
                          <label className="text-[8px] font-sans font-bold uppercase opacity-50 block mb-1">Live WebSocket Trace Logs</label>
                          <div className="bg-brand-console text-brand-green p-3 h-48 overflow-y-auto text-[8px] space-y-1">
                            {terminalLogs.length === 0 ? (
                              <p className="opacity-40 italic">-- No socket stream frames yet --</p>
                            ) : (
                              terminalLogs.map((log, i) => (
                                <p key={i} className="break-all">{log}</p>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })()
              ) : (
                <Card secondary className="bg-brand-muted/30 border-dashed text-center py-12">
                   <Terminal className="mx-auto mb-2 text-zinc-400" size={24} />
                   <p className="text-[9px] font-bold uppercase opacity-50">Select a WebSocket instance to activate live routing frame simulator.</p>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApiGatewayView;
