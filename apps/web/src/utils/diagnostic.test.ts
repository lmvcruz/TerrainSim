import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { captureLayoutDiagnostics, sendDiagnosticToServer, runDiagnostic } from './diagnostic'

describe('diagnostic', () => {
  beforeEach(() => {
    // Setup DOM environment
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  describe('captureLayoutDiagnostics', () => {
    it('captures window size', () => {
      const diagnostic = captureLayoutDiagnostics()

      expect(diagnostic.windowSize).toBeDefined()
      expect(diagnostic.windowSize.width).toBe(window.innerWidth)
      expect(diagnostic.windowSize.height).toBe(window.innerHeight)
    })

    it('includes timestamp', () => {
      const diagnostic = captureLayoutDiagnostics()

      expect(diagnostic.timestamp).toBeDefined()
      expect(typeof diagnostic.timestamp).toBe('string')
      expect(new Date(diagnostic.timestamp).toString()).not.toBe('Invalid Date')
    })

    it('returns empty arrays when no panels exist', () => {
      const diagnostic = captureLayoutDiagnostics()

      expect(diagnostic.panels).toEqual([])
      expect(diagnostic.groups).toEqual([])
    })

    it('captures panel information', () => {
      // Create mock panel
      const panel = document.createElement('div')
      panel.setAttribute('data-panel', 'test-panel')
      panel.className = 'test-class'
      panel.style.width = '200px'
      panel.style.height = '100px'
      document.body.appendChild(panel)

      const diagnostic = captureLayoutDiagnostics()

      expect(diagnostic.panels).toHaveLength(1)
      expect(diagnostic.panels[0]).toMatchObject({
        index: 0,
        className: 'test-class',
        dataset: expect.any(Object),
      })
      expect(diagnostic.panels[0].computedStyles).toBeDefined()
      expect(diagnostic.panels[0].computedStyles.display).toBeDefined()
    })

    it('captures multiple panels', () => {
      // Create multiple panels
      for (let i = 0; i < 3; i++) {
        const panel = document.createElement('div')
        panel.setAttribute('data-panel', `panel-${i}`)
        document.body.appendChild(panel)
      }

      const diagnostic = captureLayoutDiagnostics()

      expect(diagnostic.panels).toHaveLength(3)
      expect(diagnostic.panels[0].index).toBe(0)
      expect(diagnostic.panels[1].index).toBe(1)
      expect(diagnostic.panels[2].index).toBe(2)
    })

    it('captures panel group information', () => {
      const group = document.createElement('div')
      group.setAttribute('data-panel-group', 'main-group')
      group.setAttribute('data-panel-group-direction', 'horizontal')

      // Add children
      const child1 = document.createElement('div')
      const child2 = document.createElement('div')
      group.appendChild(child1)
      group.appendChild(child2)

      document.body.appendChild(group)

      const diagnostic = captureLayoutDiagnostics()

      expect(diagnostic.groups).toHaveLength(1)
      expect(diagnostic.groups[0]).toMatchObject({
        orientation: 'horizontal',
        childCount: 2,
      })
      expect(diagnostic.groups[0].width).toBeGreaterThanOrEqual(0)
      expect(diagnostic.groups[0].height).toBeGreaterThanOrEqual(0)
    })

    it('handles panel group without direction attribute', () => {
      const group = document.createElement('div')
      group.setAttribute('data-panel-group', 'no-direction')
      document.body.appendChild(group)

      const diagnostic = captureLayoutDiagnostics()

      expect(diagnostic.groups).toHaveLength(1)
      expect(diagnostic.groups[0].orientation).toBe('unknown')
    })

    it('captures container information', () => {
      const container = document.createElement('div')
      container.setAttribute('data-panel-group', 'container')
      container.style.width = '300px'
      container.style.height = '400px'
      document.body.appendChild(container)

      const diagnostic = captureLayoutDiagnostics()

      // Should capture containers matching selectors
      expect(diagnostic.containers).toBeDefined()
      expect(Array.isArray(diagnostic.containers)).toBe(true)
    })

    it('captures panel dataset attributes', () => {
      const panel = document.createElement('div')
      panel.setAttribute('data-panel', 'test')
      panel.setAttribute('data-panel-id', 'unique-id')
      panel.setAttribute('data-test-attr', 'test-value')
      document.body.appendChild(panel)

      const diagnostic = captureLayoutDiagnostics()

      expect(diagnostic.panels[0].dataset).toBeDefined()
      expect(typeof diagnostic.panels[0].dataset).toBe('object')
    })

    it('captures panel computed styles', () => {
      const panel = document.createElement('div')
      panel.setAttribute('data-panel', 'styled')
      panel.style.display = 'flex'
      panel.style.position = 'relative'
      document.body.appendChild(panel)

      const diagnostic = captureLayoutDiagnostics()

      expect(diagnostic.panels[0].computedStyles).toMatchObject({
        display: expect.any(String),
        position: expect.any(String),
        flexGrow: expect.any(String),
        flexShrink: expect.any(String),
        flexBasis: expect.any(String),
        width: expect.any(String),
        height: expect.any(String),
      })
    })

    it('captures panel bounding rect', () => {
      const panel = document.createElement('div')
      panel.setAttribute('data-panel', 'positioned')
      document.body.appendChild(panel)

      const diagnostic = captureLayoutDiagnostics()

      expect(diagnostic.panels[0]).toMatchObject({
        width: expect.any(Number),
        height: expect.any(Number),
        left: expect.any(Number),
        top: expect.any(Number),
      })
    })
  })

  describe('sendDiagnosticToServer', () => {
    let fetchMock: ReturnType<typeof vi.fn>

    beforeEach(() => {
      fetchMock = vi.fn()
      global.fetch = fetchMock
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('sends diagnostic data to server', async () => {
      const mockDiagnostic = {
        timestamp: new Date().toISOString(),
        windowSize: { width: 1920, height: 1080 },
        panels: [],
        groups: [],
        containers: [],
      }

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })

      await sendDiagnosticToServer(mockDiagnostic)

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const callArgs = fetchMock.mock.calls[0]
      expect(callArgs[0]).toContain('/dev/logs')
      expect(callArgs[1]).toMatchObject({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    })

    it('includes diagnostic data in request body', async () => {
      const mockDiagnostic = {
        timestamp: '2026-01-20T00:00:00.000Z',
        windowSize: { width: 1024, height: 768 },
        panels: [{ index: 0, width: 100, height: 100, left: 0, top: 0, className: 'test', dataset: {}, computedStyles: { display: 'block', position: 'static', flexGrow: '0', flexShrink: '1', flexBasis: 'auto', width: '100px', height: '100px' } }],
        groups: [],
        containers: [],
      }

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })

      await sendDiagnosticToServer(mockDiagnostic)

      const callArgs = fetchMock.mock.calls[0]
      const body = JSON.parse(callArgs[1].body)

      expect(body).toMatchObject({
        level: 'info',
        component: 'LayoutDiagnostic',
        message: 'UI Layout State',
        metadata: mockDiagnostic,
      })
    })

    it('handles server errors gracefully', async () => {
      const mockDiagnostic = {
        timestamp: new Date().toISOString(),
        windowSize: { width: 800, height: 600 },
        panels: [],
        groups: [],
        containers: [],
      }

      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      // Should not throw
      await expect(sendDiagnosticToServer(mockDiagnostic)).resolves.not.toThrow()
    })

    it('handles network errors gracefully', async () => {
      const mockDiagnostic = {
        timestamp: new Date().toISOString(),
        windowSize: { width: 800, height: 600 },
        panels: [],
        groups: [],
        containers: [],
      }

      fetchMock.mockRejectedValueOnce(new Error('Network error'))

      // Should not throw
      await expect(sendDiagnosticToServer(mockDiagnostic)).resolves.not.toThrow()
    })
  })

  describe('runDiagnostic', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      global.fetch = vi.fn().mockResolvedValue({ ok: true })
    })

    afterEach(() => {
      vi.restoreAllMocks()
      vi.useRealTimers()
    })

    it('waits 1 second before capturing diagnostics', () => {
      const consoleSpy = vi.spyOn(console, 'table').mockImplementation(() => {})

      runDiagnostic()

      // Should not have run yet
      expect(consoleSpy).not.toHaveBeenCalled()

      // Fast-forward time
      vi.advanceTimersByTime(1000)

      // Should have run now
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('prints diagnostic table to console', () => {
      const consoleSpy = vi.spyOn(console, 'table').mockImplementation(() => {})

      // Create test panel
      const panel = document.createElement('div')
      panel.setAttribute('data-panel', 'test')
      document.body.appendChild(panel)

      runDiagnostic()
      vi.advanceTimersByTime(1000)

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            index: 0,
            width: expect.stringContaining('px'),
            height: expect.stringContaining('px'),
            left: expect.stringContaining('px'),
            display: expect.any(String),
          }),
        ])
      )

      consoleSpy.mockRestore()
    })

    it('sends diagnostic to server after capture', async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true })
      global.fetch = fetchMock

      runDiagnostic()
      vi.advanceTimersByTime(1000)

      // Wait for async operations
      await vi.runAllTimersAsync()

      expect(fetchMock).toHaveBeenCalled()
    })
  })

  describe('integration', () => {
    it('captures complete layout state', () => {
      // Setup complex layout
      const container = document.createElement('div')
      container.className = 'h-screen w-screen'

      const group = document.createElement('div')
      group.setAttribute('data-panel-group', 'main')
      group.setAttribute('data-panel-group-direction', 'vertical')

      const panel1 = document.createElement('div')
      panel1.setAttribute('data-panel', 'panel-1')
      panel1.className = 'border-r border-zinc-700'

      const panel2 = document.createElement('div')
      panel2.setAttribute('data-panel', 'panel-2')

      group.appendChild(panel1)
      group.appendChild(panel2)
      container.appendChild(group)
      document.body.appendChild(container)

      const diagnostic = captureLayoutDiagnostics()

      expect(diagnostic.panels.length).toBeGreaterThanOrEqual(2)
      expect(diagnostic.groups.length).toBeGreaterThanOrEqual(1)
      expect(diagnostic.timestamp).toBeDefined()
      expect(diagnostic.windowSize).toBeDefined()
    })
  })
})
