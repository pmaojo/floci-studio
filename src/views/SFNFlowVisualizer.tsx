import { useState } from 'react';
import { Eye, Code } from 'lucide-react';
import { Card } from '../components/ui-elements';

interface CompiledNode {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  level: number;
}

interface CompiledEdge {
  from: string;
  to: string;
  label?: string;
}

interface StateMachineItem {
  stateMachineArn: string;
  name: string;
  type: string;
  creationDate: string;
  definition: string;
}

interface SFNFlowVisualizerProps {
  flowNodes: CompiledNode[];
  flowEdges: CompiledEdge[];
  selectedMachine: StateMachineItem | null;
}

export function SFNFlowVisualizer({ flowNodes, flowEdges, selectedMachine }: SFNFlowVisualizerProps) {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const getNodeColor = (type: string, isHovered: boolean, isSelected: boolean) => {
    const activeBorder = isSelected ? 'stroke-brand-text stroke-[2px]' : isHovered ? 'stroke-neutral-800 stroke-[1.5px]' : 'stroke-brand-text/30 stroke-[1px]';

    switch (type) {
      case 'START':
        return { fill: 'fill-emerald-100', strokeClass: activeBorder + ' stroke-emerald-600' };
      case 'END':
        return { fill: 'fill-rose-100', strokeClass: activeBorder + ' stroke-rose-600' };
      case 'Choice':
        return { fill: 'fill-amber-50', strokeClass: activeBorder + ' stroke-amber-500' };
      case 'Fail':
        return { fill: 'fill-rose-50', strokeClass: activeBorder + ' stroke-rose-400' };
      case 'Succeed':
        return { fill: 'fill-emerald-50', strokeClass: activeBorder + ' stroke-emerald-400' };
      case 'Parallel':
        return { fill: 'fill-indigo-50', strokeClass: activeBorder + ' stroke-indigo-400' };
      case 'Pass':
        return { fill: 'fill-blue-50', strokeClass: activeBorder + ' stroke-blue-400' };
      default:
        return { fill: 'fill-white', strokeClass: activeBorder };
    }
  };

  const getSelectedNodeAsl = () => {
    if (!selectedNodeId || !selectedMachine) return null;
    try {
      const asl = JSON.parse(selectedMachine.definition);
      return asl.States?.[selectedNodeId] || null;
    } catch {
      return null;
    }
  };

  const selectedNodeDetails = getSelectedNodeAsl();

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
      {/* SVG Render box */}
      <div className="flex-1 p-4 overflow-auto flex items-center justify-center bg-brand-muted/10 border-r border-brand-text/10">
        <div className="relative border border-brand-text bg-white p-6 shadow-sm overflow-hidden select-none min-w-[500px]">
          <div className="absolute top-3 left-3 flex items-center gap-1 text-[8px] font-bold text-neutral-400 tracking-widest uppercase">
            <Eye size={10} />
            Live Interactive Chart
          </div>

          <svg width="650" height="520">
            {/* Arrows Head Defs */}
            <defs>
              <marker
                id="arrow"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#64748b" />
              </marker>
            </defs>

            {/* Render Flow Edges */}
            {flowEdges.map((e, idx) => {
              const fromNode = flowNodes.find(n => n.id === e.from);
              const toNode = flowNodes.find(n => n.id === e.to);

              if (!fromNode || !toNode) return null;

              const isStraight = fromNode.x === toNode.x;
              const h = 40;
              const y1 = fromNode.y + h / 2;
              const y2 = toNode.y - h / 2;
              const x1 = fromNode.x;
              const x2 = toNode.x;

              if (isStraight) {
                return (
                  <g key={idx}>
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="#64748b"
                      strokeWidth="1.5"
                      markerEnd="url(#arrow)"
                    />
                    {e.label && (
                      <text
                        x={x1 + 6}
                        y={(y1 + y2) / 2}
                        className="font-mono text-[8px] fill-amber-700 bg-white"
                        textAnchor="start"
                      >
                        {e.label}
                      </text>
                    )}
                  </g>
                );
              } else {
                // Nice curves path
                const midY = (y1 + y2) / 2;
                const dPath = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
                return (
                  <g key={idx}>
                    <path
                      d={dPath}
                      fill="none"
                      stroke="#64748b"
                      strokeWidth="1.2"
                      markerEnd="url(#arrow)"
                    />
                    {e.label && (
                      <text
                        x={(x1 + x2) / 2 + 5}
                        y={midY - 4}
                        className="font-mono text-[8px] fill-amber-700 font-bold"
                        textAnchor="middle"
                      >
                        {e.label}
                      </text>
                    )}
                  </g>
                );
              }
            })}

            {/* Render Flow Nodes */}
            {flowNodes.map(n => {
              const isVirtual = n.type === 'START' || n.type === 'END';
              const isHovered = hoveredNodeId === n.id;
              const isSelected = selectedNodeId === n.id;

              const { fill, strokeClass } = getNodeColor(n.type, isHovered, isSelected);
              const cardW = isVirtual ? 60 : 120;
              const cardH = 34;

              return (
                <g
                  key={n.id}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredNodeId(n.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  onClick={() => !isVirtual && setSelectedNodeId(n.id)}
                >
                  <rect
                    x={n.x - cardW / 2}
                    y={n.y - cardH / 2}
                    width={cardW}
                    height={cardH}
                    rx={isVirtual ? 17 : 4}
                    className={`${fill} ${strokeClass} transition-all duration-150`}
                  />
                  <text
                    x={n.x}
                    y={n.y + 3}
                    className={`font-mono text-[9px] text-center ${
                      isVirtual ? 'font-bold uppercase tracking-wider' : 'normal-case text-neutral-800'
                    }`}
                    textAnchor="middle"
                  >
                    {n.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Node details or ASL definition panel */}
      <div className="w-96 overflow-y-auto p-4 bg-brand-muted/10 shrink-0 flex flex-col gap-4">
        {selectedNodeId && selectedNodeDetails ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-brand-text/15 pb-2">
              <h4 className="font-bold text-[10px] tracking-wider text-brand-text font-mono">State: {selectedNodeId}</h4>
              <button
                onClick={() => setSelectedNodeId(null)}
                className="text-[8px] font-bold text-neutral-400 hover:text-neutral-600 border px-1 bg-white"
              >
                Close
              </button>
            </div>

            <Card className="space-y-3 font-mono text-[10px]">
              <div className="flex justify-between border-b border-brand-text/5 pb-1.5">
                <span className="opacity-60">Type:</span>
                <span className="font-bold">{selectedNodeDetails.Type}</span>
              </div>

              {selectedNodeDetails.Resource && (
                <div className="border-b border-brand-text/5 pb-1.5 space-y-1">
                  <span className="opacity-60 block">Resource:</span>
                  <span className="font-bold text-neutral-600 block break-all leading-normal lowercase">{selectedNodeDetails.Resource}</span>
                </div>
              )}

              {selectedNodeDetails.Next && (
                <div className="flex justify-between border-b border-brand-text/5 pb-1.5">
                  <span className="opacity-60">Transition Next:</span>
                  <span className="font-bold">{selectedNodeDetails.Next}</span>
                </div>
              )}

              {selectedNodeDetails.End && (
                <div className="flex justify-between border-b border-brand-text/5 pb-1.5">
                  <span className="opacity-60">Terminal End:</span>
                  <span className="font-bold text-brand-green">TRUE</span>
                </div>
              )}

              {selectedNodeDetails.Error && (
                <div className="border-b border-brand-text/5 pb-1.5 space-y-1">
                  <span className="opacity-60 block">Error Tag:</span>
                  <span className="font-bold text-rose-600 block">{selectedNodeDetails.Error}</span>
                </div>
              )}

              {selectedNodeDetails.Cause && (
                <div className="space-y-1">
                  <span className="opacity-60 block">Cause:</span>
                  <span className="italic text-neutral-500 block leading-normal normal-case">{selectedNodeDetails.Cause}</span>
                </div>
              )}
            </Card>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="flex items-center gap-2 border-b border-brand-text/15 pb-2 mb-3">
              <Code size={14} className="text-brand-text/50" />
              <h4 className="font-bold text-[10px] tracking-wider text-brand-text font-mono uppercase">ASL definition</h4>
            </div>

            <pre className="flex-1 w-full bg-brand-console text-brand-green p-4 font-mono text-[10px] overflow-y-auto border border-brand-text/20 select-text normal-case leading-relaxed">
              {selectedMachine?.definition}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
