import { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import useStore from '../store/useStore'
import MapContainer from '../components/MapContainer'
import CheckinModal from '../components/CheckinModal'
import CheckinForm from '../components/CheckinForm'
import { NearbyStorePanel } from '../components/NearbyPanel'
import NearbyPanel from '../components/NearbyPanel'
import useGeofence from '../hooks/useGeofence'
import { gcj02ToWgs84, wgs84ToGcj02 } from '../utils/coordTransform'
import { getDeviceId } from '../utils/deviceId'

function MapPage() {
  const {
    lang,
    favorites,
    checkins,
    fetchFavorites,
    fetchCheckins,
    setUserLocation,
    isTestMode,
    setIsTestMode,
    mockLocation,
    setMockLocation,
  } = useStore()
  const [searchParams] = useSearchParams()
  const [locations, setLocations] = useState([])
  const [movies, setMovies] = useState([])
  const [focusLocation, setFocusLocation] = useState(null)
  const [filter, setFilter] = useState('all')
  const [selectedMovie, setSelectedMovie] = useState('')
  const [selectedMusic, setSelectedMusic] = useState('')
  const [geofenceLocation, setGeofenceLocation] = useState(null)
  const [geofenceDistance, setGeofenceDistance] = useState(0)
  const [showCheckinModal, setShowCheckinModal] = useState(false)
  const [showCheckinForm, setShowCheckinForm] = useState(false)
  const [isRouteMode, setIsRouteMode] = useState(false)
  const [selectedRouteLocs, setSelectedRouteLocs] = useState([])
  const [routeInfo, setRouteInfo] = useState(null)
  const [nearbyList, setNearbyList] = useState([])
  const [showNearbyPanel, setShowNearbyPanel] = useState(false)
  const walkingRef = useRef(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const [locRes, movieRes] = await Promise.all([
          fetch('/api/locations'),
          fetch('/api/movies?limit=1000'),
        ])
        const locJson = await locRes.json()
        const movieJson = await movieRes.json()
        if (locJson.success) setLocations(locJson.data)
        if (movieJson.success) setMovies(movieJson.data.items)
      } catch (e) {
        console.error(e)
      }
    }
    fetchData()
    fetchFavorites()
    fetchCheckins()
  }, [fetchFavorites, fetchCheckins])

  // 处理从电影详情页跳转来的 location 参数
  useEffect(() => {
    const locationId = searchParams.get('location')
    if (!locationId || locations.length === 0) return
    const loc = locations.find((l) => l.id === locationId)
    if (loc) {
      setFocusLocation(loc)
    }
  }, [searchParams, locations])

  const handleEnterGeofence = useCallback((location, distance) => {
    setGeofenceLocation(location)
    setGeofenceDistance(distance)
    setShowCheckinModal(true)
  }, [])

  const { startWatching, stopWatching, nearestLocation, userPosition } = useGeofence({
    locations,
    favorites,
    checkins,
    mockLocation,
    onEnterGeofence: handleEnterGeofence,
  })

  useEffect(() => {
    startWatching()
    return () => stopWatching()
  }, [startWatching, stopWatching])

  useEffect(() => {
    const pos = mockLocation || userPosition
    if (!pos) return
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/locations/nearby?lat=${pos.lat}&lng=${pos.lng}&radius=500&limit=5`,
          { headers: { 'x-device-id': getDeviceId() } }
        )
        const json = await res.json()
        if (json.success) setNearbyList(json.data)
      } catch (e) {
        console.error(e)
      }
    }, 1000)
    return () => clearTimeout(timer)
  }, [mockLocation, userPosition])

  const activeFilter = selectedMovie ? { movieId: Number(selectedMovie) }
    : selectedMusic ? { movieId: Number(selectedMusic) }
    : filter

  const filmMovies = movies.filter((m) => m.work_type !== 'Music')
  const musicMovies = movies.filter((m) => m.work_type === 'Music')

  const handleMyLocation = () => {
    if (mockLocation) {
      const { lng, lat } = wgs84ToGcj02(mockLocation.lng, mockLocation.lat)
      window.dispatchEvent(new CustomEvent('map-set-center', { detail: { lng: mockLocation.lng, lat: mockLocation.lat } }))
      return
    }
    if (!navigator.geolocation) {
      alert('您的浏览器不支持地理定位')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { longitude, latitude } = position.coords
        setUserLocation({ lng: longitude, lat: latitude })
        window.dispatchEvent(new CustomEvent('map-set-center', { detail: { lng: longitude, lat: latitude } }))
      },
      () => {
        alert('无法获取您的位置')
      }
    )
  }

  const handleMapClick = useCallback(
    (gcjLng, gcjLat) => {
      if (!isTestMode) return
      const { lng, lat } = gcj02ToWgs84(gcjLng, gcjLat)
      setMockLocation({ lng, lat, isMock: true })
    },
    [isTestMode, setMockLocation]
  )

  const handleToggleTestMode = useCallback(() => {
    const next = !isTestMode
    setIsTestMode(next)
    if (!next) {
      setMockLocation(null)
    }
  }, [isTestMode, setIsTestMode, setMockLocation])

  const favoriteLocations = locations.filter((loc) => favorites.includes(loc.id))

  const handleToggleRouteLoc = (loc) => {
    setSelectedRouteLocs((prev) => {
      const exists = prev.find((l) => l.id === loc.id)
      if (exists) return prev.filter((l) => l.id !== loc.id)
      if (prev.length >= 8) {
        alert('最多选择 8 个地点')
        return prev
      }
      return [...prev, loc]
    })
  }

  const handleGenerateRoute = () => {
    if (selectedRouteLocs.length < 2) {
      alert('请至少选择 2 个地点')
      return
    }

    // 清除旧路线
    if (window.__hkRoutePolyline) {
      window.__hkRoutePolyline.forEach(p => p.setMap(null))
      window.__hkRoutePolyline = null
    }

    // 坐标转换：WGS-84 → GCJ-02
    const points = selectedRouteLocs.map((loc) => {
      const { lng, lat } = wgs84ToGcj02(loc.longitude, loc.latitude)
      return new window.AMap.LngLat(lng, lat)
    })

    // N 个点规划 N-1 段（A→B, B→C, C→D...）
    const segments = []
    for (let i = 0; i < points.length - 1; i++) {
      segments.push({
        start: points[i],
        end: points[i + 1],
        startName: selectedRouteLocs[i].location_name,
        endName: selectedRouteLocs[i + 1].location_name,
      })
    }

    let totalDistance = 0
    let totalTime = 0
    let allPath = []        // 合并所有路径点
    let completedCount = 0  // 已完成的路段数

    const doSearch = () => {
      segments.forEach((seg, index) => {
        const walking = new window.AMap.Walking({
          map: null,          // 不自动绘制，手动画
          hideMarkers: true,  // 隐藏默认起终点 marker
        })

        walking.search(seg.start, seg.end, (status, result) => {
          completedCount++

          if (status === 'complete' && result.routes && result.routes[0]) {
            const route = result.routes[0]
            totalDistance += route.distance
            totalTime += route.time

            // 提取这段路径的所有坐标点
            if (route.steps && route.steps.length > 0) {
              route.steps.forEach((step) => {
                if (step.path && step.path.length > 0) {
                  step.path.forEach((p) => {
                    allPath.push([p.getLng(), p.getLat()])
                  })
                }
              })
            }
          } else {
            console.warn(`路段 ${index + 1} 规划失败:`, status, result)
            // 这段失败，用直线连接
            allPath.push([seg.start.getLng(), seg.start.getLat()])
            allPath.push([seg.end.getLng(), seg.end.getLat()])
          }

          // 所有路段都完成后，统一绘制
          if (completedCount === segments.length) {
            setRouteInfo({
              distance: totalDistance,
              time: totalTime,
            })

            if (allPath.length > 0) {
              drawRoute(allPath)
            }
          }
        })
      })
    }

    if (window.AMap.Walking) {
      doSearch()
    } else {
      window.AMap.plugin(['AMap.Walking'], doSearch)
    }
  }

  function drawRoute(path) {
    if (!window.__hkMapInstance || path.length === 0) return

    window.__hkRoutePolyline = new window.AMap.Polyline({
      path,
      strokeColor: '#D4AF37',
      strokeWeight: 6,
      strokeOpacity: 0.9,
      strokeStyle: 'solid',
      lineJoin: 'round',
      lineCap: 'round',
      zIndex: 100,
      showDir: true,  // 显示方向箭头
    })

    window.__hkRoutePolyline.setMap(window.__hkMapInstance)
    window.__hkMapInstance.setFitView([window.__hkRoutePolyline], false, [80, 80, 80, 80])
  }

  const handleClearRoute = () => {
    setSelectedRouteLocs([])
    setRouteInfo(null)
    if (window.__hkRoutePolyline) {
      window.__hkRoutePolyline.setMap(null)
      window.__hkRoutePolyline = null
    }
  }

  return (
    <div className="relative h-screen">
      {isTestMode && (
        <div className="absolute top-0 left-0 right-0 z-20 bg-yellow-400 text-yellow-900 text-center text-xs py-1">
          测试模式已开启，点击地图任意位置可模拟当前位置
          {mockLocation && nearestLocation && (
            <span className="ml-2">
              最近收藏：{nearestLocation.location.location_name}（{nearestLocation.distance} 米）
            </span>
          )}
        </div>
      )}

      <div className="absolute top-0 left-0 right-0 z-10 bg-white/90 backdrop-blur p-3 shadow max-h-[120px]">
        <div className="flex gap-2 overflow-x-auto items-center overflow-y-hidden">
          {[
            { key: 'all', label: lang === 'hant' ? '全部地点' : '全部地点' },
            { key: 'favorites', label: lang === 'hant' ? '我的心愿' : '我的心愿' },
            { key: 'checkins', label: lang === 'hant' ? '已打卡' : '已打卡' },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => {
                setFilter(item.key)
                setSelectedMovie('')
                setSelectedMusic('')
              }}
              className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap ${
                filter === item.key && !selectedMovie && !selectedMusic
                  ? 'bg-journal-stamp text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {item.label}
            </button>
          ))}
          <select
            value={selectedMovie}
            onChange={(e) => {
              setSelectedMovie(e.target.value)
              setSelectedMusic('')
              if (e.target.value) setFilter('all')
            }}
            className="px-2 py-1.5 rounded-full text-sm bg-gray-100 text-gray-600 border-none outline-none w-[48%]"
          >
            <option value="">{lang === 'hant' ? '按电影筛选' : '按电影筛选'}</option>
            {filmMovies.map((m) => (
              <option key={m.id} value={m.id}>
                {lang === 'hant' ? m.title_hant : m.title_hans}
              </option>
            ))}
          </select>
          <select
            value={selectedMusic}
            onChange={(e) => {
              setSelectedMusic(e.target.value)
              setSelectedMovie('')
              if (e.target.value) setFilter('all')
            }}
            className="px-2 py-1.5 rounded-full text-sm bg-gray-100 text-gray-600 border-none outline-none w-[48%]"
          >
            <option value="">{lang === 'hant' ? '按音乐筛选' : '按音乐筛选'}</option>
            {musicMovies.map((m) => (
              <option key={m.id} value={m.id}>
                {lang === 'hant' ? m.title_hant : m.title_hans}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              setIsRouteMode(!isRouteMode)
              if (isRouteMode) handleClearRoute()
            }}
            className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap ${
              isRouteMode ? 'bg-journal-gold text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {isRouteMode ? '退出规划' : '规划路线'}
          </button>
          <button
            onClick={handleToggleTestMode}
            className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap ${
              isTestMode ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            🧪 测试模式
          </button>
        </div>
      </div>

      <MapContainer
        locations={locations}
        favorites={favorites}
        checkins={checkins}
        filter={activeFilter}
        onMapClick={handleMapClick}
        mockLocation={mockLocation}
        focusLocation={focusLocation}
      />

      {isRouteMode && (
        <div className="absolute bottom-16 left-0 right-0 z-20 bg-white rounded-t-2xl shadow-lg p-4 max-h-[40vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-sm">选择心愿单地点（{selectedRouteLocs.length}/8）</h4>
            {selectedRouteLocs.length >= 2 && (
              <button
                onClick={handleGenerateRoute}
                className="px-3 py-1 rounded-full bg-journal-stamp text-white text-xs"
              >
                生成路线
              </button>
            )}
          </div>
          <div className="space-y-2">
            {favoriteLocations.map((loc) => {
              const selected = selectedRouteLocs.find((l) => l.id === loc.id)
              return (
                <label
                  key={loc.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={!!selected}
                    onChange={() => handleToggleRouteLoc(loc)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm flex-1">{loc.location_name}</span>
                  {selected && (
                    <span className="text-xs bg-journal-stamp text-white px-2 py-0.5 rounded-full">
                      {selectedRouteLocs.findIndex((l) => l.id === loc.id) + 1}
                    </span>
                  )}
                </label>
              )
            })}
          </div>
          {routeInfo && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-sm text-gray-700">
                总距离：{(routeInfo.distance / 1000).toFixed(2)} km
              </p>
              <p className="text-sm text-gray-700">
                预计步行：{Math.ceil(routeInfo.time / 60)} 分钟
              </p>
            </div>
          )}
        </div>
      )}

      <button
        onClick={handleMyLocation}
        className="absolute bottom-20 right-4 z-10 bg-white rounded-full shadow-lg p-3 text-journal-stamp min-w-[44px] min-h-[44px]"
        title="我的位置"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {showCheckinModal && geofenceLocation && (
        <CheckinModal
          location={geofenceLocation}
          distance={geofenceDistance}
          isMock={!!mockLocation}
          onConfirm={() => {
            setShowCheckinModal(false)
            setShowCheckinForm(true)
          }}
          onDismiss={() => setShowCheckinModal(false)}
        />
      )}

      {showCheckinForm && geofenceLocation && (
        <CheckinForm
          location={geofenceLocation}
          onSuccess={() => {
            setShowCheckinForm(false)
            fetchCheckins()
          }}
          onCancel={() => setShowCheckinForm(false)}
        />
      )}

      {nearbyList.length > 0 && (
        <button
          onClick={() => setShowNearbyPanel(true)}
          className="absolute bottom-36 right-4 z-10 bg-journal-gold text-white rounded-full shadow-lg px-3 py-2 text-xs font-medium flex items-center gap-1 min-h-[36px]"
        >
          <span>📍</span>
          <span>附近 {nearbyList.length}</span>
        </button>
      )}

      {showNearbyPanel && (
        <NearbyPanel
          locations={nearbyList}
          onClose={() => setShowNearbyPanel(false)}
          lang={lang}
        />
      )}

      <NearbyStorePanel />
    </div>
  )
}

export default MapPage
