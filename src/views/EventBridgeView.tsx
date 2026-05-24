import { useState, useEffect } from 'react';
import { ListEventBusesCommand, CreateEventBusCommand, PutEventsCommand, ListRulesCommand } from '@aws-sdk/client-eventbridge';
import { useAws } from '../contexts/AwsContext';
import { Share2, CirclePlus, Send } from 'lucide-react';
import { PageHeader, Card, Button, Input, Skeleton, Modal } from '../components/ui-elements';

const EventBridgeView = () => {
  const { clients, logActivity } = useAws();
  const [buses, setBuses] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventData, setEventData] = useState('{\n  "source": "my.app",\n  "detail-type": "order.created",\n  "detail": {\n    "id": "123",\n    "status": "pending"\n  }\n}');
  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);
  const [newBusName, setNewBusName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const busResp = await clients.eventbridge.send(new ListEventBusesCommand({}));
      setBuses(busResp.EventBuses || []);
      const rulesResp = await clients.eventbridge.send(new ListRulesCommand({}));
      setRules(rulesResp.Rules || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBus = async () => {
    if (!newBusName) return;
    setIsCreating(true);
    try {
      await clients.eventbridge.send(new CreateEventBusCommand({ Name: newBusName }));
      logActivity('EventBridge', `CreateEventBus: ${newBusName}`, 'success');
      setNewBusName('');
      setIsCreationModalOpen(false);
      fetchData();
    } catch (err: any) {
      logActivity('EventBridge', `CreateEventBus failed: ${newBusName}`, 'error', err.message);
      alert(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handlePutEvents = async () => {
    try {
      const parsed = JSON.parse(eventData);
      await clients.eventbridge.send(new PutEventsCommand({
        Entries: [{
          Source: parsed.source,
          DetailType: parsed['detail-type'],
          Detail: JSON.stringify(parsed.detail),
          EventBusName: 'default'
        }]
      }));
      logActivity('EventBridge', 'PutEvents', 'success', `source: ${parsed.source}`);
      alert('Event dispatched to Bus successfully');
    } catch (err: any) {
      logActivity('EventBridge', 'PutEvents failed', 'error', err.message);
      alert(err.message);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader 
        title="EventBridge / Buses" 
        icon={<Share2 size={18} />}
        onRefresh={fetchData}
        isRefreshing={loading}
        actions={
          <Button onClick={() => setIsCreationModalOpen(true)} icon={<CirclePlus size={14} />}>
            New Bus
          </Button>
        }
      />

      <Modal 
        isOpen={isCreationModalOpen} 
        onClose={() => setIsCreationModalOpen(false)} 
        title="Create Event Bus"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Bus Name</label>
            <Input 
              value={newBusName}
              onChange={e => setNewBusName(e.target.value)}
              placeholder="MarketingBus"
              autoFocus
            />
          </div>
          
          <div className="pt-4 flex gap-3">
             <Button 
               variant="ghost" 
               className="flex-1" 
               onClick={() => setIsCreationModalOpen(false)}
             >
               Cancel
             </Button>
             <Button 
               className="flex-1" 
               onClick={handleCreateBus} 
               disabled={!newBusName || isCreating}
             >
               {isCreating ? 'Creating...' : 'Create Bus'}
             </Button>
          </div>
        </div>
      </Modal>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 overflow-auto bg-brand-bg">
        <div className="space-y-6">
          <div>
            <h3 className="text-[10px] font-bold tracking-widest opacity-40 mb-3">EVENT_BUSES</h3>
            <div className="space-y-2">
              {loading ? <Skeleton className="h-20" /> : buses.map(bus => (
                <Card key={bus.Name} className="hover:border-brand-text transition-colors">
                   <div className="flex justify-between items-center">
                     <div>
                       <p className="text-[11px] font-bold font-mono">{bus.Name}</p>
                       <p className="text-[9px] opacity-40 truncate lowercase">{bus.Arn}</p>
                     </div>
                     <span className="text-[9px] font-bold opacity-30">ACTIVE</span>
                   </div>
                </Card>
              ))}
            </div>
          </div>

          <div>
             <h3 className="text-[10px] font-bold tracking-widest opacity-40 mb-3">ROUTING_RULES</h3>
             <div className="space-y-2">
               {loading ? <Skeleton className="h-20" /> : rules.length === 0 ? (
                 <div className="text-center py-10 bg-brand-muted/10 border border-dashed border-brand-text/20">
                    <p className="text-[9px] opacity-30 italic font-mono">No rules defined</p>
                 </div>
               ) : rules.map(rule => (
                 <Card key={rule.Name}>
                    <div className="flex justify-between items-center">
                      <p className="text-[11px] font-bold font-mono">{rule.Name}</p>
                      <span className="bg-brand-text text-white px-2 py-0.5 text-[8px] font-bold">{rule.State}</span>
                    </div>
                    <p className="text-[9px] mt-2 opacity-50 font-mono italic truncate">{rule.EventPattern}</p>
                 </Card>
               ))}
             </div>
          </div>
        </div>

        <div className="space-y-6">
           <h3 className="text-[10px] font-bold tracking-widest opacity-40">EMIT_TEST_EVENT</h3>
           <Card className="bg-white flex flex-col h-[400px]">
              <div className="flex-1">
                <label className="text-[9px] font-bold opacity-50 block mb-2 uppercase">Event JSON Payload</label>
                <textarea 
                  className="w-full h-[300px] border border-brand-text p-4 text-[11px] font-mono focus:outline-none bg-brand-muted/5"
                  value={eventData}
                  onChange={e => setEventData(e.target.value)}
                />
              </div>
              <div className="mt-4 flex gap-3">
                 <Button className="flex-1" icon={<Send size={14} />} onClick={handlePutEvents}>
                    Dispatch Event
                 </Button>
              </div>
           </Card>
           <p className="text-[9px] font-mono opacity-40 italic">
             Note: Local events are routed to targets (Lambda, SQS, etc.) based on rule matching.
           </p>
        </div>
      </div>
    </div>
  );
};

export default EventBridgeView;
