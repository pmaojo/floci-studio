import React, { useState } from 'react';
import { RefreshCw, CirclePlus, Trash2, Cpu, FileCode, Check, Server, Radio, MessageSquare } from 'lucide-react';
import { PageHeader, Card, Button, Input, Modal, Select } from '../components/ui-elements';
import { useAws } from '../contexts/AwsContext';

interface IotThing {
  id: string;
  name: string;
  typeName: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'PROVISIONING';
  arn: string;
  lastPing: string;
}

const IotCoreView = () => {
  const { logActivity } = useAws();
  const [things, setThings] = useState<IotThing[]>(() => {
    const saved = localStorage.getItem('aws-sim-iotcore');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback below
      }
    }
    return [
      {
        id: "iot-001",
        name: "smart-sensor-temp-01",
        typeName: "IndustrialSensor",
        status: "CONNECTED",
        arn: "arn:aws:iot:eu-central-1:123456789012:thing/smart-sensor-temp-01",
        lastPing: "Just now"
      }
    ];
  });

  React.useEffect(() => {
    localStorage.setItem('aws-sim-iotcore', JSON.stringify(things));
  }, [things]);

  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [type, setType] = useState('IndustrialSensor');

  const fetchThings = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      logActivity('IoT Core', 'ListThings', 'success');
    }, 500);
  };

  const handleCreate = () => {
    if (!newName) return;
    const cleanId = newName.replace(/[^a-zA-Z0-9-_]/g, '');
    const newThing: IotThing = {
      id: `iot-${Math.random().toString(36).substring(5)}`,
      name: cleanId,
      typeName: type,
      status: 'PROVISIONING',
      arn: `arn:aws:iot:eu-central-1:123456789012:thing/${cleanId}`,
      lastPing: "Never"
    };

    setThings(prev => [...prev, newThing]);
    logActivity('IoT Core', `RegisterThing: ${cleanId}`, 'success');
    setIsModalOpen(false);
    setNewName('');

    setTimeout(() => {
      setThings(prev =>
        prev.map(t => t.name === cleanId ? { ...t, status: 'CONNECTED', lastPing: 'Just now' } : t)
      );
      logActivity('IoT Core', `ThingConnected: ${cleanId}`, 'success');
    }, 4500);
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete IoT Thing ${name}?`)) return;
    setThings(prev => prev.filter(t => t.id !== id));
    logActivity('IoT Core', `DeleteThing: ${name}`, 'success');
  };

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader
        title="IoT Core Registry"
        icon={<Radio size={18} />}
        onRefresh={fetchThings}
        isRefreshing={loading}
        actions={
          <Button onClick={() => setIsModalOpen(true)} icon={<CirclePlus size={14} />}>
            Register Thing
          </Button>
        }
      />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Register IoT Thing">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Thing Name</label>
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="thermostat-living-room"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Thing Type</label>
            <Select value={type} onChange={e => setType(e.target.value)}>
              <option value="IndustrialSensor">Industrial IoT Sensor</option>
              <option value="SmartThermostat">Smart Thermostat Controller</option>
              <option value="SecurityCamera">IP Security Camera</option>
              <option value="ActuatorArm">Pneumatic Actuator Arm</option>
            </Select>
          </div>

          <div className="pt-4 flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleCreate} disabled={!newName}>
               Register Thing
            </Button>
          </div>
        </div>
      </Modal>

      <div className="p-6 space-y-6 flex-1 overflow-auto bg-brand-bg">
        <div className="bg-brand-muted/40 border border-brand-text/10 p-4 rounded-sm">
          <h3 className="font-serif-italic text-sm font-bold text-brand-text">Mqtt broker device registry</h3>
          <p className="text-[9px] font-mono opacity-60 normal-case leading-relaxed max-w-xl mt-1">
            Securely connect and manage billions of physical IoT devices. Maintain device metadata, build microsecond MQTT event brokers, and create routing patterns to store data directly in DynamoDB tables.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {things.map(thing => (
            <Card key={thing.id} className="bg-white hover:border-brand-text transition-all relative">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 border border-brand-text bg-brand-muted/10">
                  <MessageSquare size={18} />
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 border ${
                    thing.status === 'CONNECTED'
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                      : 'border-blue-400 bg-blue-50 text-blue-800 animate-pulse'
                  }`}>
                    {thing.status}
                  </span>
                  <button onClick={() => handleDelete(thing.id, thing.name)} className="p-1 hover:text-rose-600 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <h4 className="font-mono font-bold text-xs truncate">{thing.name}</h4>
              <p className="text-[9px] opacity-50 truncate mt-1 lowercase font-mono">{thing.arn}</p>

              <div className="grid grid-cols-2 gap-2 mt-6 pt-3 border-t border-brand-text/10 bg-brand-muted/15 p-2 text-center rounded-sm">
                <div>
                  <span className="text-[7px] text-zinc-400 block font-mono">THING_TYPE</span>
                  <span className="text-[9px] font-bold font-mono">{thing.typeName}</span>
                </div>
                <div>
                  <span className="text-[7px] text-zinc-400 block font-mono">LAST_PING</span>
                  <span className="text-[9px] font-bold font-mono lowercase">{thing.lastPing}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default IotCoreView;
