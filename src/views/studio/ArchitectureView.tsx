import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Card } from '../../components/ui-elements';

export default function ArchitectureView() {
  const [data, setData] = useState<{nodes: any[], edges: any[]} | null>(null);
  const [loading, setLoading] = useState(true);
  const mermaidRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({ startOnLoad: false, theme: 'base', themeVariables: { primaryColor: '#f97316', lineColor: '#3b82f6' } });

    // Fetch data from sidecar proxy
    fetch('/sidecar/api/studio/architecture')
      .then(res => res.json())
      .then(json => {
        setData(json);
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!data || !mermaidRef.current) return;

    let graphDefinition = 'graph TD;\n';

    const byType = data.nodes.reduce((acc: any, node: any) => {
      acc[node.type] = acc[node.type] || [];
      acc[node.type].push(node);
      return acc;
    }, {});

    for (const type in byType) {
      graphDefinition += `  subgraph ${type}\n`;
      for (const node of byType[type]) {
        graphDefinition += `    ${node.id}["${node.label}"]\n`;
      }
      graphDefinition += `  end\n`;
    }

    if (data.nodes.length === 0) {
      graphDefinition += '  Empty["No resources found"]\n';
    }

    mermaidRef.current.innerHTML = '';
    mermaid.render('mermaid-svg', graphDefinition).then((res: any) => {
        if(mermaidRef.current) mermaidRef.current.innerHTML = res.svg;
    }).catch((e: any) => console.error("Mermaid error", e));

  }, [data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Studio Architecture Visualizer</h1>
        <p className="text-slate-400">Real-time dependency and topology map of your local AWS environment</p>
      </div>

      <Card>
        <div className="border-b border-brand-text bg-brand-muted p-4">
          <h3 className="font-serif-italic text-lg text-brand-text">Topology Map</h3>
        </div>
        <div className="p-4">
          {loading ? (
             <div className="flex justify-center p-10"><div className="text-brand-text">Loading...</div></div>
          ) : (
            <div className="w-full bg-slate-900 rounded p-4 flex justify-center overflow-x-auto min-h-[400px]">
              <div ref={mermaidRef} className="mermaid" />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
