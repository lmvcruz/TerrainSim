/**
 * Diagnostic utility to capture and report UI layout information
 */

interface PanelDiagnostic {
  index: number;
  width: number;
  height: number;
  left: number;
  top: number;
  className: string;
  dataset: Record<string, string>;
  computedStyles: {
    display: string;
    position: string;
    flexGrow: string;
    flexShrink: string;
    flexBasis: string;
    width: string;
    height: string;
  };
}

interface LayoutDiagnostic {
  timestamp: string;
  windowSize: { width: number; height: number };
  panels: PanelDiagnostic[];
  groups: Array<{
    orientation: string;
    width: number;
    height: number;
    childCount: number;
  }>;
  containers: Array<{
    selector: string;
    width: number;
    height: number;
    computedDisplay: string;
  }>;
}

export function captureLayoutDiagnostics(): LayoutDiagnostic {
  const diagnostic: LayoutDiagnostic = {
    timestamp: new Date().toISOString(),
    windowSize: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    panels: [],
    groups: [],
    containers: [],
  };

  // Capture all panels
  const panels = document.querySelectorAll('[data-panel]');
  panels.forEach((panel, index) => {
    const rect = panel.getBoundingClientRect();
    const computed = window.getComputedStyle(panel);

    const panelInfo: PanelDiagnostic = {
      index,
      width: rect.width,
      height: rect.height,
      left: rect.left,
      top: rect.top,
      className: panel.className,
      dataset: panel instanceof HTMLElement ? { ...panel.dataset } as Record<string, string> : {},
      computedStyles: {
        display: computed.display,
        position: computed.position,
        flexGrow: computed.flexGrow,
        flexShrink: computed.flexShrink,
        flexBasis: computed.flexBasis,
        width: computed.width,
        height: computed.height,
      },
    };

    diagnostic.panels.push(panelInfo);
  });

  // Capture groups
  const groups = document.querySelectorAll('[data-panel-group]');
  groups.forEach((group) => {
    const rect = group.getBoundingClientRect();
    diagnostic.groups.push({
      orientation: group.getAttribute('data-panel-group-direction') || 'unknown',
      width: rect.width,
      height: rect.height,
      childCount: group.children.length,
    });
  });

  // Capture key containers
  const selectors = [
    '.h-screen.w-screen',
    '[data-panel-group]',
    '.border-r.border-zinc-700',
    '.border-l.border-zinc-700',
  ];

  selectors.forEach((selector) => {
    const elements = document.querySelectorAll(selector);
    elements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const computed = window.getComputedStyle(el);
      diagnostic.containers.push({
        selector,
        width: rect.width,
        height: rect.height,
        computedDisplay: computed.display,
      });
    });
  });

  return diagnostic;
}

export async function sendDiagnosticToServer(diagnostic: LayoutDiagnostic) {
  try {
    const response = await fetch('http://localhost:3001/dev/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level: 'info',
        component: 'LayoutDiagnostic',
        message: 'UI Layout State',
        metadata: diagnostic,
      }),
    });

    if (response.ok) {
      console.log('✅ Diagnostic sent to server');
    }
  } catch (error) {
    console.error('❌ Failed to send diagnostic:', error);
  }
}

export function runDiagnostic() {
  console.log('🔍 Running layout diagnostic...');

  // Wait for layout to settle
  setTimeout(() => {
    const diagnostic = captureLayoutDiagnostics();
    console.log('📊 Layout Diagnostic:', diagnostic);

    // Send to server
    sendDiagnosticToServer(diagnostic);

    // Pretty print in console
    console.table(diagnostic.panels.map(p => ({
      index: p.index,
      width: `${p.width.toFixed(0)}px`,
      height: `${p.height.toFixed(0)}px`,
      left: `${p.left.toFixed(0)}px`,
      display: p.computedStyles.display,
    })));
  }, 1000);
}
