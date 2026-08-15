import { useEffect, useRef, useState, useCallback, useMemo } from 'react'

function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function useGeofence({ locations, favorites, checkins, mockLocation, onEnterGeofence }) {
  const [isWatching, setIsWatching] = useState(false)
  const [nearestLocation, setNearestLocation] = useState(null)
  const [userPosition, setUserPosition] = useState(null)
  const watchIdRef = useRef(null)
  const triggeredRef = useRef(new Set())

  const candidateLocations = useMemo(
    () => locations.filter(
      (loc) => favorites.includes(loc.id) && !checkins.includes(loc.id)
    ),
    [locations, favorites, checkins]
  )

  const evaluatePosition = useCallback(
    (lat, lng, accuracy) => {
      let nearest = null
      let minDistance = Infinity

      candidateLocations.forEach((loc) => {
        if (!loc.latitude || !loc.longitude) return
        const dist = getDistance(lat, lng, loc.latitude, loc.longitude)
        if (dist < minDistance) {
          minDistance = dist
          nearest = { location: loc, distance: Math.round(dist) }
        }
      })

      setNearestLocation(nearest)

      if (nearest && nearest.distance <= 100) {
        const locId = nearest.location.id
        if (!triggeredRef.current.has(locId)) {
          triggeredRef.current.add(locId)
          onEnterGeofence(nearest.location, nearest.distance, {
            lowAccuracy: accuracy > 50,
          })
        }
      }
    },
    [candidateLocations, onEnterGeofence]
  )

  useEffect(() => {
    if (mockLocation) {
      setUserPosition({ lat: mockLocation.lat, lng: mockLocation.lng, accuracy: 0 })
      evaluatePosition(mockLocation.lat, mockLocation.lng, 0)
      return
    }

    if (!isWatching) return

    if (!navigator.geolocation) {
      alert('您的浏览器不支持地理定位')
      return
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords
        setUserPosition({ lat: latitude, lng: longitude, accuracy })
        evaluatePosition(latitude, longitude, accuracy)
      },
      (err) => {
        if (err.code === 1) {
          console.warn('GPS 权限被拒绝，请在浏览器设置中允许定位权限')
        } else if (err.code === 2) {
          console.warn('GPS 位置不可用')
        } else if (err.code === 3) {
          console.warn('GPS 定位超时，建议开启测试模式模拟位置')
        } else {
          console.error('GPS 错误:', err)
        }
      },
      {
        enableHighAccuracy: false,
        maximumAge: 60000,
        timeout: 8000,
      }
    )

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [isWatching, mockLocation, evaluatePosition])

  const startWatching = useCallback(() => {
    triggeredRef.current.clear()
    setIsWatching(true)
  }, [])

  const stopWatching = useCallback(() => {
    setIsWatching(false)
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }, [])

  return {
    startWatching,
    stopWatching,
    isWatching,
    nearestLocation,
    userPosition,
  }
}

export default useGeofence
