import type { ReactNode } from 'react';

export const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="space-y-1">
    <label className="text-[10px] font-bold uppercase opacity-60">{label}</label>
    {children}
  </div>
);

export const ResultPanel = ({ title, result, onClose }: { title: string; result: unknown; onClose: () => void }) => (
  <div className="bg-brand-console text-brand-green border border-brand-green/20 p-4 font-mono text-[10px] mb-6 relative normal-case">
    <div className="flex justify-between items-center mb-2 border-b border-brand-green/10 pb-1 uppercase">
      <span className="font-bold tracking-widest">{title}</span>
      <button onClick={onClose} className="hover:text-white uppercase font-bold">[Close]</button>
    </div>
    <pre className="overflow-auto max-h-56 whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
  </div>
);
