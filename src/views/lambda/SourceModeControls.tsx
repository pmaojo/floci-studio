import { Upload } from 'lucide-react';
import { Input, Textarea } from '../../components/ui-elements';
import type { LambdaSourceMode } from './types';

interface Props {
  sourceMode: LambdaSourceMode;
  setSourceMode: (value: LambdaSourceMode) => void;
  sourceFileName: string;
  setSourceFileName: (value: string) => void;
  sourceCode: string;
  setSourceCode: (value: string) => void;
  zipFile: File | null;
  setZipFile: (file: File | null) => void;
  allowTemplate: boolean;
}

export const SourceModeControls = ({
  sourceMode,
  setSourceMode,
  sourceFileName,
  setSourceFileName,
  sourceCode,
  setSourceCode,
  zipFile,
  setZipFile,
  allowTemplate,
}: Props) => (
  <div className="space-y-3">
    <div className="grid grid-cols-3 border border-brand-text text-[9px] font-bold uppercase">
      <button type="button" disabled={!allowTemplate} onClick={() => setSourceMode('template')} className={`py-2 border-r border-brand-text disabled:opacity-30 ${sourceMode === 'template' ? 'bg-brand-text text-brand-bg' : 'bg-white'}`}>
        Template
      </button>
      <button type="button" onClick={() => setSourceMode('inline')} className={`py-2 border-r border-brand-text ${sourceMode === 'inline' ? 'bg-brand-text text-brand-bg' : 'bg-white'}`}>
        Inline
      </button>
      <button type="button" onClick={() => setSourceMode('zipBase64')} className={`py-2 ${sourceMode === 'zipBase64' ? 'bg-brand-text text-brand-bg' : 'bg-white'}`}>
        ZIP Upload
      </button>
    </div>

    {sourceMode === 'inline' && (
      <>
        <Input value={sourceFileName} onChange={event => setSourceFileName(event.target.value)} placeholder="index.js" className="font-mono" />
        <Textarea value={sourceCode} onChange={event => setSourceCode(event.target.value)} className="h-56 font-mono normal-case leading-relaxed resize-none" spellCheck={false} />
      </>
    )}

    {sourceMode === 'zipBase64' && (
      <label className="flex flex-col items-center justify-center gap-2 border border-dashed border-brand-text bg-white p-6 text-[10px] font-bold uppercase cursor-pointer hover:bg-brand-muted">
        <Upload size={18} />
        <span>{zipFile ? zipFile.name : 'Select deployment ZIP'}</span>
        <input type="file" accept=".zip" className="hidden" onChange={event => setZipFile(event.target.files?.[0] || null)} />
      </label>
    )}
  </div>
);
