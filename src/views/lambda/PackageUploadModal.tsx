import { Save } from 'lucide-react';
import { Button, Modal } from '../../components/ui-elements';
import { SourceModeControls } from './SourceModeControls';
import type { LambdaCapabilities } from '../../lib/sidecarApi';
import type { LambdaSourceMode } from './types';
import { Field } from './Field';
import { Input, Select } from '../../components/ui-elements';

export interface CreateLambdaModalProps {
  isOpen: boolean;
  onClose: () => void;
  capabilities: LambdaCapabilities;
  functionName: string;
  setFunctionName: (value: string) => void;
  runtime: string;
  setRuntime: (value: string) => void;
  handler: string;
  setHandler: (value: string) => void;
  role: string;
  setRole: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  memory: string;
  setMemory: (value: string) => void;
  timeout: string;
  setTimeout: (value: string) => void;
  sourceMode: LambdaSourceMode;
  setSourceMode: (value: LambdaSourceMode) => void;
  sourceFileName: string;
  setSourceFileName: (value: string) => void;
  sourceCode: string;
  setSourceCode: (value: string) => void;
  zipFile: File | null;
  setZipFile: (file: File | null) => void;
  isCreating: boolean;
  onCreate: () => void;
}

export const CreateLambdaModal = (props: CreateLambdaModalProps) => {
  const runtimeOption = props.capabilities.runtimes.find(item => item.value === props.runtime);

  return (
    <Modal isOpen={props.isOpen} onClose={props.onClose} title="Create Lambda Function" className="max-w-3xl">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-4">
          <Field label="Function Name"><Input value={props.functionName} onChange={e => props.setFunctionName(e.target.value)} placeholder="my-processor" autoFocus /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Runtime">
              <Select value={props.runtime} onChange={e => props.setRuntime(e.target.value)}>
                {props.capabilities.runtimes.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
              </Select>
            </Field>
            <Field label="Handler"><Input value={props.handler} onChange={e => props.setHandler(e.target.value)} className="font-mono" /></Field>
          </div>
          <Field label="Role ARN"><Input value={props.role} onChange={e => props.setRole(e.target.value)} className="font-mono text-[10px]" /></Field>
          <Field label="Description"><Input value={props.description} onChange={e => props.setDescription(e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Memory">
              <Select value={props.memory} onChange={e => props.setMemory(e.target.value)}>
                <option value="128">128 MB</option>
                <option value="256">256 MB</option>
                <option value="512">512 MB</option>
                <option value="1024">1024 MB</option>
                <option value="2048">2048 MB</option>
              </Select>
            </Field>
            <Field label="Timeout"><Input type="number" value={props.timeout} onChange={e => props.setTimeout(e.target.value)} /></Field>
          </div>
          <div className="p-3 bg-brand-muted/30 border border-brand-text border-dashed text-[10px] opacity-70 normal-case">
            El sidecar ejecuta AWS CLI contra Floci, empaqueta código temporal y permite ZIPs compilados para runtimes no interpretados.
          </div>
        </div>
        <div className="space-y-4">
          <Field label="Code Source">
            <SourceModeControls
              sourceMode={props.sourceMode}
              setSourceMode={props.setSourceMode}
              sourceFileName={props.sourceFileName}
              setSourceFileName={props.setSourceFileName}
              sourceCode={props.sourceCode}
              setSourceCode={props.setSourceCode}
              zipFile={props.zipFile}
              setZipFile={props.setZipFile}
              allowTemplate={Boolean(runtimeOption?.supportsTemplate)}
            />
          </Field>
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" className="flex-1" onClick={props.onClose}>Cancel</Button>
            <Button className="flex-1" onClick={props.onCreate} disabled={!props.functionName || props.isCreating}>
              {props.isCreating ? 'Creating...' : 'Create Function'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export interface CodeUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetName?: string;
  sourceMode: LambdaSourceMode;
  setSourceMode: (value: LambdaSourceMode) => void;
  sourceFileName: string;
  setSourceFileName: (value: string) => void;
  sourceCode: string;
  setSourceCode: (value: string) => void;
  zipFile: File | null;
  setZipFile: (file: File | null) => void;
  isSaving: boolean;
  onSave: () => void;
}

export const CodeUpdateModal = (props: CodeUpdateModalProps) => (
  <Modal isOpen={props.isOpen} onClose={props.onClose} title={`Update Code ${props.targetName || ''}`} className="max-w-3xl">
    <div className="space-y-4">
      <SourceModeControls
        sourceMode={props.sourceMode}
        setSourceMode={props.setSourceMode}
        sourceFileName={props.sourceFileName}
        setSourceFileName={props.setSourceFileName}
        sourceCode={props.sourceCode}
        setSourceCode={props.setSourceCode}
        zipFile={props.zipFile}
        setZipFile={props.setZipFile}
        allowTemplate={false}
      />
      <div className="flex gap-3">
        <Button variant="ghost" className="flex-1" onClick={props.onClose}>Cancel</Button>
        <Button className="flex-1" icon={<Save size={14} />} onClick={props.onSave} disabled={props.isSaving}>
          {props.isSaving ? 'Saving...' : 'Update Code'}
        </Button>
      </div>
    </div>
  </Modal>
);
