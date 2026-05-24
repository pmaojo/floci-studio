import { Settings } from 'lucide-react';
import { Button, Input, Modal, Select } from '../../components/ui-elements';
import type { LambdaCapabilities } from '../../lib/sidecarApi';
import type { LambdaConfigDraft } from './types';
import { Field } from './Field';
import type { Dispatch, SetStateAction } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  targetName?: string;
  capabilities: LambdaCapabilities;
  draft: LambdaConfigDraft;
  setDraft: Dispatch<SetStateAction<LambdaConfigDraft>>;
  isSaving: boolean;
  onSave: () => void;
}

export const ConfigModal = (props: Props) => (
  <Modal isOpen={props.isOpen} onClose={props.onClose} title={`Configure ${props.targetName || ''}`} className="max-w-2xl">
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Runtime">
          <Select value={props.draft.runtime} onChange={e => props.setDraft(prev => ({ ...prev, runtime: e.target.value }))}>
            {props.capabilities.runtimes.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </Select>
        </Field>
        <Field label="Handler"><Input value={props.draft.handler} onChange={e => props.setDraft(prev => ({ ...prev, handler: e.target.value }))} className="font-mono" /></Field>
      </div>
      <Field label="Role ARN"><Input value={props.draft.role} onChange={e => props.setDraft(prev => ({ ...prev, role: e.target.value }))} className="font-mono text-[10px]" /></Field>
      <Field label="Description"><Input value={props.draft.description} onChange={e => props.setDraft(prev => ({ ...prev, description: e.target.value }))} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Memory"><Input type="number" value={props.draft.memorySize} onChange={e => props.setDraft(prev => ({ ...prev, memorySize: e.target.value }))} /></Field>
        <Field label="Timeout"><Input type="number" value={props.draft.timeout} onChange={e => props.setDraft(prev => ({ ...prev, timeout: e.target.value }))} /></Field>
      </div>
      <div className="flex gap-3">
        <Button variant="ghost" className="flex-1" onClick={props.onClose}>Cancel</Button>
        <Button className="flex-1" icon={<Settings size={14} />} onClick={props.onSave} disabled={props.isSaving}>
          {props.isSaving ? 'Saving...' : 'Save Config'}
        </Button>
      </div>
    </div>
  </Modal>
);
