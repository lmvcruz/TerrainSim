import { Panel, Group, Separator } from 'react-resizable-panels';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useRef } from 'react';
import type { PanelImperativeHandle } from 'react-resizable-panels';
import { PipelineProvider } from '../../contexts/PipelineContext';
import PipelineBuilder from './PipelineBuilder';
import JobManager from './JobManager';
import ConfigurationTimeline from './ConfigurationTimeline';
import TerrainViewer from './TerrainViewer';

export default function PipelineLayout() {
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [bottomCollapsed, setBottomCollapsed] = useState(false);

  const leftPanelRef = useRef<PanelImperativeHandle>(null);
  const rightPanelRef = useRef<PanelImperativeHandle>(null);
  const bottomPanelRef = useRef<PanelImperativeHandle>(null);

  const toggleLeftPanel = () => {
    if (leftCollapsed) {
      leftPanelRef.current?.expand();
    } else {
      leftPanelRef.current?.collapse();
    }
    setLeftCollapsed(!leftCollapsed);
  };

  const toggleRightPanel = () => {
    if (rightCollapsed) {
      rightPanelRef.current?.expand();
    } else {
      rightPanelRef.current?.collapse();
    }
    setRightCollapsed(!rightCollapsed);
  };

  const toggleBottomPanel = () => {
    if (bottomCollapsed) {
      bottomPanelRef.current?.expand();
    } else {
      bottomPanelRef.current?.collapse();
    }
    setBottomCollapsed(!bottomCollapsed);
  };

  return (
    <PipelineProvider>
      <div className="h-screen w-screen flex flex-col bg-zinc-900 text-white overflow-hidden">
        {/* Top Section: 3 vertical panels */}
        <Group orientation="horizontal" className="flex-1">
          {/* Left Panel: Pipeline Builder */}
          <Panel
            panelRef={leftPanelRef}
            defaultSize={25}
            minSize={15}
            maxSize={40}
            collapsible={true}
          >
            {!leftCollapsed && (
              <div className="h-full flex flex-col border-r border-zinc-700">
                <div className="flex items-center justify-between p-3 border-b border-zinc-700 bg-zinc-800">
                  <h2 className="text-sm font-semibold">Pipeline Builder</h2>
                  <button
                    onClick={toggleLeftPanel}
                    className="p-1 hover:bg-zinc-700 rounded"
                    aria-label="Collapse left panel"
                  >
                    <ChevronLeft size={16} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <PipelineBuilder />
                </div>
              </div>
            )}
            {leftCollapsed && (
              <div className="h-full w-8 border-r border-zinc-700 flex items-center justify-center bg-zinc-800">
                <button
                  onClick={toggleLeftPanel}
                  className="p-1 hover:bg-zinc-700 rounded rotate-90"
                  aria-label="Expand left panel"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </Panel>

          <Separator className="w-1 bg-zinc-700 hover:bg-blue-500 transition-colors" />

          {/* Center Panel: 3D Viewer */}
          <Panel defaultSize={50} minSize={30}>
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between p-3 border-b border-zinc-700 bg-zinc-800">
                <h2 className="text-sm font-semibold">Terrain Viewer</h2>
              </div>
              <div className="flex-1 relative">
                <TerrainViewer />
              </div>
            </div>
          </Panel>

          <Separator className="w-1 bg-zinc-700 hover:bg-blue-500 transition-colors" />

          {/* Right Panel: Job Manager */}
          <Panel
            panelRef={rightPanelRef}
            defaultSize={25}
            minSize={15}
            maxSize={40}
            collapsible={true}
          >
            {!rightCollapsed && (
              <div className="h-full flex flex-col border-l border-zinc-700">
                <div className="flex items-center justify-between p-3 border-b border-zinc-700 bg-zinc-800">
                  <h2 className="text-sm font-semibold">Job Manager</h2>
                  <button
                    onClick={toggleRightPanel}
                    className="p-1 hover:bg-zinc-700 rounded"
                    aria-label="Collapse right panel"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <JobManager />
                </div>
              </div>
            )}
            {rightCollapsed && (
              <div className="h-full w-8 border-l border-zinc-700 flex items-center justify-center bg-zinc-800">
                <button
                  onClick={toggleRightPanel}
                  className="p-1 hover:bg-zinc-700 rounded -rotate-90"
                  aria-label="Expand right panel"
                >
                  <ChevronLeft size={16} />
                </button>
              </div>
            )}
          </Panel>
        </Group>

        {/* Bottom Panel: Configuration Timeline */}
        <Group orientation="vertical">
          <Panel panelRef={bottomPanelRef} defaultSize={150} minSize={100} maxSize={300} collapsible={true}>
            {!bottomCollapsed && (
              <div className="h-full flex flex-col border-t border-zinc-700">
                <div className="flex items-center justify-between p-3 border-b border-zinc-700 bg-zinc-800">
                  <h2 className="text-sm font-semibold">Configuration Timeline</h2>
                  <button
                    onClick={toggleBottomPanel}
                    className="p-1 hover:bg-zinc-700 rounded"
                    aria-label="Collapse timeline"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
                <div className="flex-1 overflow-auto">
                  <ConfigurationTimeline />
                </div>
              </div>
            )}
            {bottomCollapsed && (
              <div className="h-8 border-t border-zinc-700 flex items-center justify-center bg-zinc-800">
                <button
                  onClick={toggleBottomPanel}
                  className="p-1 hover:bg-zinc-700 rounded"
                  aria-label="Expand timeline"
                >
                  <ChevronUp size={16} />
                </button>
              </div>
            )}
          </Panel>
        </Group>
      </div>
    </PipelineProvider>
  );
}
