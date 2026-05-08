import { useEffect, useRef, useState, useCallback } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './RadarMap.css'

const CENTER = [-37.779, 144.919]
const ZOOM = 8
const RADAR_API = 'https://api.rainviewer.com/public/weather-maps.json'
const COLOR_SCHEME = 2
const FRAME_INTERVAL_MS = 600

function formatTime(unixTimestamp) {
  return new Date(unixTimestamp * 1000).toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Australia/Melbourne',
  })
}

function RadarLayer({ host, path, opacity }) {
  const map = useMap()
  const layerRef = useRef(null)

  useEffect(() => {
    if (!host || !path) return
    if (layerRef.current) {
      map.removeLayer(layerRef.current)
    }

    layerRef.current = L.tileLayer(
      `${host}${path}/256/{z}/{x}/{y}/${COLOR_SCHEME}/1_1.png`,
      { opacity, attribution: '' }
    )
    layerRef.current.addTo(map)

    return () => {
      if (layerRef.current) map.removeLayer(layerRef.current)
    }
  }, [host, path, map, opacity])

  return null
}

export default function RadarMap() {
  const [frames, setFrames] = useState([])
  const [host, setHost] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const intervalRef = useRef(null)

  const fetchFrames = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch(RADAR_API)
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json()
      setHost(data.host)
      setFrames(data.radar.past)
      setCurrentIndex(data.radar.past.length - 1)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFrames()
    const refresh = setInterval(fetchFrames, 10 * 60 * 1000)
    return () => clearInterval(refresh)
  }, [fetchFrames])

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex(i => (i + 1) % frames.length)
      }, FRAME_INTERVAL_MS)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [playing, frames.length])

  const currentFrame = frames[currentIndex]

  return (
    <div className="radar-section">
      <div className="radar-header">
        <h2>Rain Radar</h2>
        {currentFrame && (
          <span className="radar-time">{formatTime(currentFrame.time)}</span>
        )}
      </div>

      {error && (
        <div className="radar-error">
          ⚠️ Radar unavailable
          <button onClick={fetchFrames}>Retry</button>
        </div>
      )}

      <div className="radar-map-wrapper">
        {loading && (
          <div className="radar-loading">
            <div className="spinner" />
          </div>
        )}
        <MapContainer
          center={CENTER}
          zoom={ZOOM}
          scrollWheelZoom={false}
          zoomControl={true}
          className="leaflet-map"
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
          />
          {currentFrame && (
            <RadarLayer host={host} path={currentFrame.path} opacity={0.7} />
          )}
        </MapContainer>
      </div>

      <div className="radar-controls">
        <button
          className="play-btn"
          onClick={() => setPlaying(p => !p)}
          disabled={frames.length === 0}
        >
          {playing ? '⏸ Pause' : '▶ Play'}
        </button>

        <input
          type="range"
          min={0}
          max={Math.max(0, frames.length - 1)}
          value={currentIndex}
          onChange={e => {
            setPlaying(false)
            setCurrentIndex(Number(e.target.value))
          }}
          className="radar-scrubber"
        />

        <span className="radar-frame-count">
          {frames.length > 0 ? `${currentIndex + 1} / ${frames.length}` : '—'}
        </span>
      </div>

      <div className="radar-attribution">
        Radar data: <a href="https://www.rainviewer.com" target="_blank" rel="noreferrer">RainViewer</a>
      </div>
    </div>
  )
}
