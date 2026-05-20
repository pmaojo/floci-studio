import React, { useState } from 'react';
import { RefreshCw, CirclePlus, Trash2, Binary, Cpu, Layers, HelpCircle, Activity } from 'lucide-react';
import { PageHeader, Card, Button, Input, Modal, Select } from '../components/ui-elements';
import { useAws } from '../contexts/AwsContext';

interface Model {
  id: string;
  name: string;
  framework: string;
  instanceType: string;
  status: 'InService' | 'Creating' | 'Failed';
  endpointName: string;
}

const SageMakerView = () => {
  const { logActivity } = useAws();
  const [models, setModels] = useState<Model[]>(() => {
    const saved = localStorage.getItem('aws-sim-sagemaker');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback below
      }
    }
    return [
      {
        id: "sm-01",
        name: "bert-nlp-classifier",
        framework: "Hugging Face (PyTorch)",
        instanceType: "ml.g4dn.xlarge",
        status: "InService",
        endpointName: "bert-nlp-classifier-endpoint"
      }
    ];
  });

  React.useEffect(() => {
    localStorage.setItem('aws-sim-sagemaker', JSON.stringify(models));
  }, [models]);

  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [framework, setFramework] = useState('Hugging Face (PyTorch)');
  const [instanceType, setInstanceType] = useState('ml.g4dn.xlarge');

  const fetchModels = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      logActivity('SageMaker', 'ListModels', 'success');
    }, 500);
  };

  const handleCreate = () => {
    if (!newName) return;
    const cleanId = newName.toLowerCase().replace(/[^a-z0-9-_]/g, '');
    const newModel: Model = {
      id: `sm-${Math.random().toString(36).substring(5)}`,
      name: cleanId,
      framework,
      instanceType,
      status: 'Creating',
      endpointName: `${cleanId}-endpoint`
    };

    setModels(prev => [...prev, newModel]);
    logActivity('SageMaker', `CreateModel: ${cleanId}`, 'success');
    setIsModalOpen(false);
    setNewName('');

    setTimeout(() => {
      setModels(prev =>
        prev.map(m => m.name === cleanId ? { ...m, status: 'InService' } : m)
      );
      logActivity('SageMaker', `ModelEndpointActive: ${cleanId}`, 'success');
    }, 4500);
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete SageMaker Model ${name}?`)) return;
    setModels(prev => prev.filter(m => m.id !== id));
    logActivity('SageMaker', `DeleteModel: ${name}`, 'success');
  };

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader
        title="SageMaker ML Models"
        icon={<Binary size={18} />}
        onRefresh={fetchModels}
        isRefreshing={loading}
        actions={
          <Button onClick={() => setIsModalOpen(true)} icon={<CirclePlus size={14} />}>
            Register Model
          </Button>
        }
      />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Register SageMaker Model">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Model Name</label>
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="llm-summarizer-fine-tuned"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Framework / Base Model</label>
            <Select value={framework} onChange={e => setFramework(e.target.value)}>
              <option value="Hugging Face (PyTorch)">Hugging Face (PyTorch)</option>
              <option value="TensorFlow 2.12">TensorFlow 2.12</option>
              <option value="XGBoost v1.5">XGBoost v1.5</option>
              <option value="Scikit-Learn (Legacy)">Scikit-Learn (Legacy)</option>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Inference Instance Type</label>
            <Select value={instanceType} onChange={e => setInstanceType(e.target.value)}>
              <option value="ml.g4dn.xlarge">ml.g4dn.xlarge (NVIDIA T4 GPU, $0.736/hr)</option>
              <option value="ml.c5.large">ml.c5.large (Compute Optimized CPU, $0.102/hr)</option>
              <option value="ml.p3.2xlarge">ml.p3.2xlarge (NVIDIA V100 GPU - High Performance)</option>
            </Select>
          </div>

          <div className="pt-4 flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleCreate} disabled={!newName}>
               Register & Host
            </Button>
          </div>
        </div>
      </Modal>

      <div className="p-6 space-y-6 flex-1 overflow-auto bg-brand-bg">
        <div className="bg-brand-muted/40 border border-brand-text/10 p-4 rounded-sm">
          <h3 className="font-serif-italic text-sm font-bold text-brand-text">Machine Learning Models & Endpoints</h3>
          <p className="text-[9px] font-mono opacity-60 normal-case leading-relaxed max-w-xl mt-1">
             Build, train, and deploy machine learning models quickly. Register customized image classifications or LLM frameworks and compile serverless real-time endpoint triggers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {models.map(model => (
            <Card key={model.id} className="bg-white hover:border-brand-text transition-all relative">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 border border-brand-text bg-brand-muted/10">
                  <Cpu size={18} />
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 border ${
                    model.status === 'InService'
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                      : 'border-blue-400 bg-blue-50 text-blue-800 animate-pulse'
                  }`}>
                    {model.status}
                  </span>
                  <button onClick={() => handleDelete(model.id, model.name)} className="p-1 hover:text-rose-600 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <h4 className="font-mono font-bold text-xs truncate">{model.name}</h4>
              <p className="text-[9px] opacity-50 truncate mt-1 lowercase font-mono">Endpoint: {model.endpointName}</p>

              <div className="grid grid-cols-2 gap-2 mt-6 pt-3 border-t border-brand-text/10 bg-brand-muted/15 p-2 text-center rounded-sm">
                <div>
                  <span className="text-[7px] text-zinc-400 block font-mono">ENGINE_FRAMEWORK</span>
                  <span className="text-[9px] font-bold font-mono text-zinc-700">{model.framework}</span>
                </div>
                <div>
                  <span className="text-[7px] text-zinc-400 block font-mono">INSTANCE_TYPE</span>
                  <span className="text-[9px] font-bold font-mono">{model.instanceType}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SageMakerView;
