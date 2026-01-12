import { useMemo, useState } from 'react'
import './StatisticsPanel.css'

export interface TerrainStatistics {
  minElevation: number
  maxElevation: number
  avgElevation: number
  range: number
  cells: number
}

interface StatisticsPanelProps {
  heightmap?: Float32Array
  width: number
  height: number
}

/**
 * StatisticsPanel displays terrain elevation statistics
 *
 * Features:
 * - Min/Max elevation values
 * - Average elevation
 * - Elevation range
 * - Grid dimensions
 * - Collapsible interface
 */
export function StatisticsPanel({ heightmap, width, height }: StatisticsPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const statistics = useMemo<TerrainStatistics | null>(() => {
    if (!heightmap || heightmap.length === 0) {
      return null
    }

    let min = Infinity
    let max = -Infinity
    let sum = 0

    for (let i = 0; i < heightmap.length; i++) {
      const value = heightmap[i]
      if (value < min) min = value
      if (value > max) max = value
      sum += value
    }

    const avg = sum / heightmap.length
    const range = max - min

    return {
      minElevation: min,
      maxElevation: max,
      avgElevation: avg,
      range,
      cells: heightmap.length,
    }
  }, [heightmap])

  if (!statistics) {
    return (
      <div className={`statistics-panel ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="panel-header">
          <h3>Terrain Statistics</h3>
          <button
            className="collapse-button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed ? '▲' : '▼'}
          </button>
        </div>
        {!isCollapsed && <p className="no-data">No terrain data available</p>}
      </div>
    )
  }

  return (
    <div className={`statistics-panel ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="panel-header">
        <h3>Terrain Statistics</h3>
        <button
          className="collapse-button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Expand" : "Collapse"}
        >
          {isCollapsed ? '▲' : '▼'}
        </button>
      </div>

      {!isCollapsed && (
        <>
          <div className="stat-grid">
        <div className="stat-item">
          <span className="stat-label">Min Elevation</span>
          <span className="stat-value">{statistics.minElevation.toFixed(2)}</span>
        </div>

        <div className="stat-item">
          <span className="stat-label">Max Elevation</span>
          <span className="stat-value">{statistics.maxElevation.toFixed(2)}</span>
        </div>

        <div className="stat-item">
          <span className="stat-label">Average</span>
          <span className="stat-value">{statistics.avgElevation.toFixed(2)}</span>
        </div>

        <div className="stat-item">
          <span className="stat-label">Range</span>
          <span className="stat-value">{statistics.range.toFixed(2)}</span>
        </div>

        <div className="stat-item">
          <span className="stat-label">Grid Size</span>
          <span className="stat-value">{width} × {height}</span>
        </div>

        <div className="stat-item">
          <span className="stat-label">Total Cells</span>
          <span className="stat-value">{statistics.cells.toLocaleString()}</span>
        </div>
      </div>

      {/* Elevation Bar */}
      <div className="elevation-bar-container">
        <div className="elevation-bar-label">Elevation Range</div>
        <div className="elevation-bar">
          <div className="elevation-gradient" />
          <div className="elevation-markers">
            <span className="marker-min">{statistics.minElevation.toFixed(1)}</span>
            <span className="marker-max">{statistics.maxElevation.toFixed(1)}</span>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  )
}
