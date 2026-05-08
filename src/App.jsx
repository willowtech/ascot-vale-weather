import { useState, useEffect } from 'react'
import './App.css'
import RadarMap from './RadarMap.jsx'

const LAT = -37.779
const LON = 144.919
const TIMEZONE = 'Australia/Melbourne'

const API_URL =
  `https://api.open-meteo.com/v1/forecast` +
  `?latitude=${LAT}&longitude=${LON}` +
  `&current=temperature_2m,apparent_temperature,relative_humidity_2m,` +
  `precipitation,weather_code,wind_speed_10m,wind_direction_10m,is_day` +
  `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum` +
  `&timezone=${TIMEZONE}` +
  `&wind_speed_unit=kmh`

const WMO_CODES = {
  0:  { label: 'Clear Sky',           icon: '☀️' },
  1:  { label: 'Mainly Clear',        icon: '🌤️' },
  2:  { label: 'Partly Cloudy',       icon: '⛅' },
  3:  { label: 'Overcast',            icon: '☁️' },
  45: { label: 'Foggy',               icon: '🌫️' },
  48: { label: 'Rime Fog',            icon: '🌫️' },
  51: { label: 'Light Drizzle',       icon: '🌦️' },
  53: { label: 'Drizzle',             icon: '🌦️' },
  55: { label: 'Heavy Drizzle',       icon: '🌧️' },
  56: { label: 'Freezing Drizzle',    icon: '🌨️' },
  57: { label: 'Heavy Freezing Drizzle', icon: '🌨️' },
  61: { label: 'Light Rain',          icon: '🌦️' },
  63: { label: 'Rain',                icon: '🌧️' },
  65: { label: 'Heavy Rain',          icon: '🌧️' },
  66: { label: 'Freezing Rain',       icon: '🌨️' },
  67: { label: 'Heavy Freezing Rain', icon: '🌨️' },
  71: { label: 'Light Snow',          icon: '🌨️' },
  73: { label: 'Snow',                icon: '❄️' },
  75: { label: 'Heavy Snow',          icon: '❄️' },
  77: { label: 'Snow Grains',         icon: '🌨️' },
  80: { label: 'Light Showers',       icon: '🌦️' },
  81: { label: 'Showers',             icon: '🌧️' },
  82: { label: 'Violent Showers',     icon: '⛈️' },
  85: { label: 'Snow Showers',        icon: '🌨️' },
  86: { label: 'Heavy Snow Showers',  icon: '❄️' },
  95: { label: 'Thunderstorm',        icon: '⛈️' },
  96: { label: 'Thunderstorm + Hail', icon: '⛈️' },
  99: { label: 'Thunderstorm + Hail', icon: '⛈️' },
}

function getWeather(code) {
  return WMO_CODES[code] ?? { label: 'Unknown', icon: '🌡️' }
}

function windDirection(deg) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return dirs[Math.round(deg / 45) % 8]
}

function formatDay(dateStr, index) {
  if (index === 0) return 'Today'
  if (index === 1) return 'Tomorrow'
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
}

function getBgClass(weatherCode, isDay) {
  if (!isDay) return 'bg-night'
  if ([0, 1].includes(weatherCode)) return 'bg-sunny'
  if ([2, 3].includes(weatherCode)) return 'bg-cloudy'
  if ([45, 48].includes(weatherCode)) return 'bg-fog'
  if (weatherCode >= 95) return 'bg-storm'
  return 'bg-rain'
}

export default function App() {
  const [weather, setWeather] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)

  async function fetchWeather() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(API_URL)
      if (!res.ok) throw new Error(`API error: ${res.status}`)
      const data = await res.json()
      setWeather(data)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWeather()
    const interval = setInterval(fetchWeather, 10 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const current = weather?.current
  const daily = weather?.daily
  const bgClass = current ? getBgClass(current.weather_code, current.is_day) : 'bg-sunny'
  const currentWeather = current ? getWeather(current.weather_code) : null

  return (
    <div className={`app ${bgClass}`}>
      <div className="container">
        <header className="header">
          <div className="location">
            <span className="location-pin">📍</span>
            <div>
              <h1>Ascot Vale</h1>
              <p className="subtitle">Victoria, Australia</p>
            </div>
          </div>
          <button className="refresh-btn" onClick={fetchWeather} disabled={loading} title="Refresh">
            <span className={loading ? 'spin' : ''}>↻</span>
          </button>
        </header>

        {error && (
          <div className="error-card">
            <p>⚠️ Could not load weather: {error}</p>
            <button onClick={fetchWeather}>Try again</button>
          </div>
        )}

        {loading && !weather && (
          <div className="loading">
            <div className="spinner" />
            <p>Loading weather…</p>
          </div>
        )}

        {current && currentWeather && (
          <div className="current-card">
            <div className="current-main">
              <span className="weather-icon">{currentWeather.icon}</span>
              <div className="temp-block">
                <span className="temp">{Math.round(current.temperature_2m)}°</span>
                <span className="unit">C</span>
              </div>
            </div>
            <p className="condition">{currentWeather.label}</p>
            <p className="feels-like">Feels like {Math.round(current.apparent_temperature)}°C</p>

            <div className="stats-grid">
              <div className="stat">
                <span className="stat-icon">💧</span>
                <span className="stat-value">{current.relative_humidity_2m}%</span>
                <span className="stat-label">Humidity</span>
              </div>
              <div className="stat">
                <span className="stat-icon">💨</span>
                <span className="stat-value">{Math.round(current.wind_speed_10m)} km/h</span>
                <span className="stat-label">Wind {windDirection(current.wind_direction_10m)}</span>
              </div>
              <div className="stat">
                <span className="stat-icon">🌧️</span>
                <span className="stat-value">{current.precipitation} mm</span>
                <span className="stat-label">Precipitation</span>
              </div>
              <div className="stat">
                <span className="stat-icon">{current.is_day ? '🌞' : '🌙'}</span>
                <span className="stat-value">{current.is_day ? 'Day' : 'Night'}</span>
                <span className="stat-label">Time of Day</span>
              </div>
            </div>
          </div>
        )}

        {daily && (
          <div className="forecast-section">
            <h2>7-Day Forecast</h2>
            <div className="forecast-list">
              {daily.time.map((date, i) => {
                const w = getWeather(daily.weather_code[i])
                return (
                  <div className="forecast-row" key={date}>
                    <span className="forecast-day">{formatDay(date, i)}</span>
                    <span className="forecast-icon">{w.icon}</span>
                    <span className="forecast-condition">{w.label}</span>
                    <div className="forecast-temps">
                      <span className="temp-high">{Math.round(daily.temperature_2m_max[i])}°</span>
                      <span className="temp-low">{Math.round(daily.temperature_2m_min[i])}°</span>
                    </div>
                    {daily.precipitation_sum[i] > 0 && (
                      <span className="forecast-rain">💧 {daily.precipitation_sum[i].toFixed(1)} mm</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <RadarMap />

        <footer className="footer">
          <p>
            Data from{' '}
            <a href="https://open-meteo.com" target="_blank" rel="noreferrer">
              Open-Meteo
            </a>
          </p>
          {lastUpdated && (
            <p>Updated {lastUpdated.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}</p>
          )}
        </footer>
      </div>
    </div>
  )
}
