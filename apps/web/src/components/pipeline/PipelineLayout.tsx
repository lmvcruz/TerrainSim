import { Panel, Group, Separator } from 'react-resizable-panels';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
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

  // Track previous sizes to restore on expand
  const [leftPreviousSize, setLeftPreviousSize] = useState(30);
  const [rightPreviousSize, setRightPreviousSize] = useState(30);
  const [bottomPreviousSize, setBottomPreviousSize] = useState(25);

  const leftPanelRef = useRef<PanelImperativeHandle>(null);
  const rightPanelRef = useRef<PanelImperativeHandle>(null);
  const bottomPanelRef = useRef<PanelImperativeHandle>(null);

  // DIAGNOSTIC: Log panel states on mount and state changes
  useState(() => {
    console.log('🔍 DIAGNOSTIC: PipelineLayout mounted');
    console.log('Window dimensions:', window.innerWidth, 'x', window.innerHeight);
    setTimeout(() => {
      const panels = document.querySelectorAll('[data-panel]');
      panels.forEach((panel, i) => {
        const rect = panel.getBoundingClientRect();
        console.log(`Panel ${i}:`, {
          width: rect.width,
          height: rect.height,
          left: rect.left,
          top: rect.top,
          classes: panel.className
        });
      });
    }, 1000);
  });

  const toggleLeftPanel = () => {
    if (leftCollapsed) {
      leftPanelRef.current?.resize(leftPreviousSize);
      setLeftCollapsed(false);
    } else {
      const currentSize = leftPanelRef.current?.getSize();
      if (currentSize) setLeftPreviousSize(currentSize);
      leftPanelRef.current?.collapse();
      setLeftCollapsed(true);
    }
  };

  const toggleRightPanel = () => {
    if (rightCollapsed) {
      rightPanelRef.current?.resize(rightPreviousSize);
      setRightCollapsed(false);
    } else {
      const currentSize = rightPanelRef.current?.getSize();
      if (currentSize) setRightPreviousSize(currentSize);
      rightPanelRef.current?.collapse();
      setRightCollapsed(true);
    }
  };

  const toggleBottomPanel = () => {
    if (bottomCollapsed) {
      bottomPanelRef.current?.resize(bottomPreviousSize);
      setBottomCollapsed(false);
    } else {
      const currentSize = bottomPanelRef.current?.getSize();
      if (currentSize) setBottomPreviousSize(currentSize);
      bottomPanelRef.current?.collapse();
      setBottomCollapsed(true);
    }
  };

  return (
    <PipelineProvider>
      <div className="h-full w-full bg-zinc-900 text-white overflow-hidden">
        <Group orientation="vertical">
          {/* Top Section: 3 horizontal panels */}
          <Panel defaultSize={75}>
            <Group orientation="horizontal">
              {/* Left Panel: Pipeline Builder */}
              <Panel
                panelRef={leftPanelRef}
                defaultSize={30}
                minSize={20}
                collapsible={true}
                collapsedSize={5}
              >
              {!leftCollapsed ? (
                <div className="h-full flex flex-col border-r border-zinc-700">
                  <div className="flex items-center justify-between p-3 border-b border-zinc-700 bg-zinc-800">
                    <h2 className="text-sm font-semibold">Pipeline Builder</h2>
                    <button
                      onClick={toggleLeftPanel}
                      className="p-1 hover:bg-zinc-700 rounded bg-zinc-800 text-white"
                      aria-label="Collapse left panel"
                    >
                      <ChevronLeft size={16} />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <PipelineBuilder />
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center border-r border-zinc-700 bg-zinc-800">
                  <button
                    onClick={toggleLeftPanel}
                    className="p-2 hover:bg-zinc-700 rounded bg-zinc-800 text-white"
                    aria-label="Expand left panel"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
          </Panel>

          <Separator className="w-1 bg-zinc-700 hover:bg-blue-500 transition-colors" />

          {/* Center Panel: 3D Viewer */}
          <Panel defaultSize={40} minSize={25}>
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
            defaultSize={30}
            minSize={20}
            collapsible={true}
            collapsedSize={5}
          >
            {!rightCollapsed ? (
              <div className="h-full flex flex-col border-l border-zinc-700">
                <div className="flex items-center justify-between p-3 border-b border-zinc-700 bg-zinc-800">
                  <h2 className="text-sm font-semibold">Job Manager</h2>
                  <button
                    onClick={toggleRightPanel}
                    className="p-1 hover:bg-zinc-700 rounded bg-zinc-800 text-white"
                    aria-label="Collapse right panel"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <JobManager />
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center border-l border-zinc-700 bg-zinc-800">
                <button
                  onClick={toggleRightPanel}
                  className="p-2 hover:bg-zinc-700 rounded bg-zinc-800 text-white"
                  aria-label="Expand right panel"
                >
                  <ChevronLeft size={16} />
                </button>
              </div>
            )}
          </Panel>
        </Group>
      </Panel>

          <Separator className="h-1 bg-zinc-700 hover:bg-blue-500 transition-colors" />

          {/* Bottom Panel: Configuration Timeline */}
          <Panel
            panelRef={bottomPanelRef}
            defaultSize={25}
            minSize={10}
            collapsible={true}
            collapsedSize={5}
          >
            {!bottomCollapsed ? (
              <div className="h-full flex flex-col border-t border-zinc-700">
                <div className="flex items-center justify-between p-3 border-b border-zinc-700 bg-zinc-800">
                  <h2 className="text-sm font-semibold">Configuration Timeline</h2>
                  <button
                    onClick={toggleBottomPanel}
                    className="p-1 hover:bg-zinc-700 rounded bg-zinc-800 text-white"
                    aria-label="Collapse timeline"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
                <div className="flex-1 overflow-auto">
                  <ConfigurationTimeline />
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center border-t border-zinc-700 bg-zinc-800">
                <button
                  onClick={toggleBottomPanel}
                  className="p-2 hover:bg-zinc-700 rounded bg-zinc-800 text-white"
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
