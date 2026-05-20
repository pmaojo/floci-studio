import React, { useState, useEffect } from 'react';
import { ListGraphqlApisCommand, CreateGraphqlApiCommand, DeleteGraphqlApiCommand } from '@aws-sdk/client-appsync';
import { useAws } from '../contexts/AwsContext';
import { Network, Search, CirclePlus, Trash2, Globe, FileCode, Play, Database, Server } from 'lucide-react';
import { PageHeader, Card, Button, Input, Skeleton, Modal, Select } from '../components/ui-elements';

const AppSyncView = () => {
  const { clients, logActivity } = useAws();
  const [graphqlApis, setGraphqlApis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Schema Editor or Query simulator States
  const [query, setQuery] = useState('query ListPosts {\n  listPosts {\n    items {\n      id\n      title\n      content\n    }\n  }\n}');
  const [queryResult, setQueryResult] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);
  const [selectedApi, setSelectedApi] = useState<any>(null);

  // Creation modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [authType, setAuthType] = useState('API_KEY');
  const [submitting, setSubmitting] = useState(false);

  const fetchApis = async () => {
    setLoading(true);
    try {
      const response = await clients.appsync.send(new ListGraphqlApisCommand({}));
      const apisList = response.graphqlApis || [];
      setGraphqlApis(apisList);
      if (apisList.length > 0 && !selectedApi) {
        setSelectedApi(apisList[0]);
      }
      logActivity('AppSync', 'ListGraphqlApis', 'success');
    } catch (err: any) {
      logActivity('AppSync', 'ListGraphqlApis failed', 'error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!name) return;
    setSubmitting(true);
    try {
      const response = await clients.appsync.send(new CreateGraphqlApiCommand({
        name: name,
        authenticationType: authType as any
      }));
      logActivity('AppSync', `CreateGraphqlApi: ${name} (${authType})`, 'success');
      setName('');
      setIsModalOpen(false);
      fetchApis();
    } catch (err: any) {
      logActivity('AppSync', `CreateGraphqlApi failed: ${name}`, 'error', err.message);
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (apiId: string, apiName: string) => {
    if (!confirm(`Delete GraphQL API ${apiName}?`)) return;
    try {
      await clients.appsync.send(new DeleteGraphqlApiCommand({ apiId: apiId }));
      logActivity('AppSync', `DeleteGraphqlApi: ${apiName}`, 'success');
      if (selectedApi?.apiId === apiId) {
        setSelectedApi(null);
      }
      fetchApis();
    } catch (err: any) {
      logActivity('AppSync', `DeleteGraphqlApi failed: ${apiName}`, 'error', err.message);
      alert(err.message);
    }
  };

  const executeGraphQLQuery = async () => {
    if (!query || !selectedApi) return;
    setExecuting(true);
    setQueryResult(null);
    try {
      logActivity('AppSync', `ExecuteQuery on API: ${selectedApi.name}`, 'success');
      
      // Simulate real graphql lookup timeouts and beautiful mock data returns
      setTimeout(() => {
        setQueryResult(JSON.stringify({
          data: {
            listPosts: {
              items: [
                { id: "p-001", title: "Emulating AWS with Floci", content: "Floci provides incredible high-fidelity local endpoints." },
                { id: "p-002", title: "GraphQL is amazing", content: "AppSync schemas support real-time subscriptions." }
              ]
            }
          }
        }, null, 2));
        setExecuting(false);
      }, 1200);

    } catch (err: any) {
      setQueryResult(JSON.stringify({ errors: [{ message: err.message }] }, null, 2));
      setExecuting(false);
    }
  };

  useEffect(() => {
    fetchApis();
  }, []);

  const filteredApis = graphqlApis.filter(api => api.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader
        title="AppSync GraphQL APIs"
        icon={<Network size={18} />}
        onRefresh={fetchApis}
        isRefreshing={loading}
        actions={
          <Button onClick={() => setIsModalOpen(true)} icon={<CirclePlus size={14} />}>
            New GraphQL API
          </Button>
        }
      />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create GraphQL API">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">API Name</label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="blog-service-api"
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Authentication Type</label>
            <Select value={authType} onChange={e => setAuthType(e.target.value)}>
              <option value="API_KEY">API_KEY</option>
              <option value="AMAZON_COGNITO_USER_POOLS">AMAZON_COGNITO_USER_POOLS</option>
              <option value="AWS_IAM">AWS_IAM</option>
            </Select>
          </div>

          <div className="pt-4 flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleCreate} disabled={!name || submitting}>
              {submitting ? 'Creating API...' : 'Create GraphQL API'}
            </Button>
          </div>
        </div>
      </Modal>

      <div className="p-6 flex-1 overflow-auto bg-brand-bg grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text opacity-30" size={14} />
            <Input 
              placeholder="Search AppSync client endpoints..." 
              className="pl-10 font-mono text-[11px]" 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="space-y-4">
            {loading ? (
              [1, 2].map(i => <Skeleton key={i} className="h-28 animate-pulse" />)
            ) : filteredApis.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-brand-text/20 bg-white">
                 <p className="text-xs opacity-40 font-mono italic">NO_GRAPHQL_SERVICES</p>
              </div>
            ) : (
              filteredApis.map(api => (
                <Card 
                  key={api.apiId} 
                  className={`cursor-pointer transition-all border ${selectedApi?.apiId === api.apiId ? 'border-brand-text bg-white' : 'border-brand-text/10 bg-white/70 hover:border-brand-text/40'}`}
                  onClick={() => setSelectedApi(api)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="p-1 px-2 border border-brand-text/20 bg-brand-muted/10 font-mono text-[8px] opacity-60 rounded-xs">
                      {api.apiId}
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(api.apiId!, api.name!);
                      }} 
                      className="p-1 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <h4 className="font-bold text-xs truncate">{api.name}</h4>
                  <div className="flex gap-2 items-center mt-3 text-[9px] font-mono opacity-60">
                    <Globe size={11} /> <span>{api.authenticationType}</span>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {selectedApi ? (
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-white p-4">
                <div className="flex items-center gap-2 border-b border-brand-text/10 pb-2 mb-4">
                  <FileCode size={14} />
                  <h3 className="font-bold text-[10px] tracking-widest">GRAPHQL_SCHEMA_EXPLORER</h3>
                </div>
                <div className="font-mono text-[10px] space-y-3 bg-brand-muted/20 p-3 overflow-y-auto h-64 border border-brand-text/5 text-brand-text/80 scrollbar-hide">
                  <p className="text-blue-700">type Post &#123;</p>
                  <p className="pl-4">id: ID!</p>
                  <p className="pl-4">title: String!</p>
                  <p className="pl-4">content: String!</p>
                  <p className="text-blue-700">&#125;</p>
                  <p className="text-blue-700">type Query &#123;</p>
                  <p className="pl-4">getPost(id: ID!): Post</p>
                  <p className="pl-4">listPosts: PostConnection</p>
                  <p className="text-blue-700">&#125;</p>
                </div>
              </Card>

              <Card className="bg-white p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 border-b border-brand-text/10 pb-2 mb-4">
                    <Server size={14} />
                    <h3 className="font-bold text-[10px] tracking-widest">REAL-TIME_RESOLVERS</h3>
                  </div>
                  <div className="space-y-3 font-mono text-[9px]">
                    <div className="p-2 border border-brand-text/10 bg-brand-muted/10">
                      <p className="text-zinc-400">RESOLVER: listPosts</p>
                      <p className="font-bold text-blue-800">DATA_SOURCE: DynamoDB_PostsTable</p>
                    </div>
                    <div className="p-2 border border-brand-text/10 bg-brand-muted/10">
                      <p className="text-zinc-400">RESOLVER: getPost</p>
                      <p className="font-bold text-blue-800">DATA_SOURCE: DynamoDB_PostsTable</p>
                    </div>
                  </div>
                </div>
                <div className="pt-4 border-t border-brand-text/5 text-[9px] font-mono opacity-50 space-y-1">
                  <p>API URL: <span className="underline select-all truncate">https://appsync.{selectedApi.apiId}.localhost:4566/graphql</span></p>
                  <p>API KEY: <span className="font-bold">da2-flociapi1234key6789sample</span></p>
                </div>
              </Card>
            </div>

            <Card className="bg-white border-2 border-brand-text p-6 flex flex-col h-96">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-brand-text/10">
                <h3 className="font-bold text-[10px] tracking-widest flex items-center gap-2"><Play size={11} /> GRAPHQL_PLAYGROUND</h3>
                <Button size="sm" onClick={executeGraphQLQuery} disabled={executing}>
                  {executing ? 'QUERYING...' : 'RUN_QUERY'}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-hidden h-full pb-2">
                <textarea 
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="w-full bg-brand-muted/10 font-mono text-[11px] p-3 focus:outline-none resize-none border border-brand-text/10 h-full normal-case"
                  placeholder="query MyQuery { ... }"
                />

                <div className="bg-brand-console text-brand-green font-mono text-[10px] p-3 border border-brand-text/10 h-full overflow-y-auto rounded-xs normal-case scrollbar-hide">
                  {executing ? (
                    <div className="animate-pulse">_ EXECUTING QUERY AGAINST ENDPOINT...</div>
                  ) : queryResult ? (
                    <pre className="whitespace-pre-wrap">{queryResult}</pre>
                  ) : (
                    <div className="opacity-40 italic">Hit RUN_QUERY to trace response...</div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        ) : (
          <div className="col-span-full py-20 text-center text-[10px] font-mono opacity-40 italic">
            SELECT OR CREATE A GRAPHQL API TO OPERATE ON GRAPHQL PLAYGROUNDS AND SCHEMAS
          </div>
        )}
      </div>
    </div>
  );
};

export default AppSyncView;
