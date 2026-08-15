import { useEffect, useRef } from 'react'
import { wgs84ToGcj02 } from '../utils/coordTransform'

function MapFootprintView({ checkins }) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)

  useEffect(() => {
    if (!window.AMap || mapInstance.current) return

    const map = new window.AMap.Map(mapRef.current, {
      zoom: 12,
      center: [114.1694, 22.3193],
    })
    mapInstance.current = map

    return () => {
      map.destroy()
      mapInstance.current = null
    }
  }, [])

  useEffect(() => {
    if (!mapInstance.current) return
    mapInstance.current.clearMap()

    const sorted = [...checkins].sort((a, b) => {
      const ta = new Date(a.checkin_time || a.checkinTime).getTime()
      const tb = new Date(b.checkin_time || b.checkinTime).getTime()
      return ta - tb
    })

    const path = []
    sorted.forEach((checkin, index) => {
      const lng = checkin.longitude
      const lat = checkin.latitude
      if (lng && lat) {
        const { lng: gcjLng, lat: gcjLat } = wgs84ToGcj02(lng, lat)
        path.push([gcjLng, gcjLat])

        const marker = new window.AMap.Marker({
          position: [gcjLng, gcjLat],
          content: `<div style="width:14px;height:14px;border-radius:50%;background:#10B981;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>`,
          offset: new window.AMap.Pixel(-7, -7),
        })
        marker.setMap(mapInstance.current)

        const label = new window.AMap.Text({
          text: `${index + 1}`,
          position: [gcjLng, gcjLat],
          offset: new window.AMap.Pixel(8, -20),
          style: {
            backgroundColor: '#fff',
            color: '#8B2635',
            fontSize: '10px',
            fontWeight: 'bold',
            padding: '2px 5px',
            borderRadius: '10px',
            border: '1px solid #8B2635',
          },
        })
        label.setMap(mapInstance.current)
      }
    })

    if (path.length > 1) {
      const polyline = new window.AMap.Polyline({
        path,
        strokeColor: '#D4AF37',
        strokeWeight: 3,
        strokeOpacity: 0.8,
      })
      polyline.setMap(mapInstance.current)
    }

    if (path.length > 0) {
      mapInstance.current.setFitView()
    }
  }, [checkins])

  return <div ref={mapRef} className="w-full h-96 rounded-lg" />
}

export default MapFootprintView
