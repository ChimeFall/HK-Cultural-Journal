import { useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import gcoord from 'gcoord'
import useStore from '../store/useStore'

function InfoWindowContent({ location, onClose }) {
  const { lang, isFavorite, addFavorite, removeFavorite, isCheckin } = useStore()
  const favorited = isFavorite(location.id)
  const checkedIn = isCheckin(location.id)

  const movieTitle = lang === 'hant' ? location.movie_title_hant : location.movie_title_hans
  const sceneDesc = location.scene_desc || ''

  return (
    <div className="p-3 max-w-[280px] max-h-[320px] overflow-y-auto">
      <div className="font-bold text-sm mb-1">{location.location_name}</div>
      <div className="text-xs text-gray-600 mb-1">
        《{movieTitle}》取景地
      </div>
      <div className="text-xs text-gray-500 mb-3 leading-relaxed">{sceneDesc}</div>
      <div className="flex gap-2">
        {favorited ? (
          <button
            onClick={() => {
              removeFavorite(location.id)
              onClose()
            }}
            className="px-3 py-1 rounded bg-gray-200 text-xs text-gray-700"
          >
            取消收藏
          </button>
        ) : (
          <button
            onClick={() => {
              addFavorite(location.id)
              onClose()
            }}
            className="px-3 py-1 rounded bg-journal-stamp text-white text-xs"
          >
            收藏
          </button>
        )}
        {favorited && !checkedIn && (
          <button
            onClick={() => {
              window.location.href = `/journal?checkin=${location.id}&verify=1`
            }}
            className="px-3 py-1 rounded bg-journal-gold text-white text-xs"
          >
            去打卡
          </button>
        )}
      </div>
    </div>
  )
}

function wgs84ToGcj02(lng, lat) {
  const [gcjLng, gcjLat] = gcoord.transform([lng, lat], gcoord.WGS84, gcoord.GCJ02)
  return [gcjLng, gcjLat]
}

function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function MapContainer({ locations, favorites, checkins, filter, onMapClick, mockLocation, focusLocation }) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const clusterInstance = useRef(null)
  const infoWindowRef = useRef(null)
  const rootRef = useRef(null)
  const mockMarkerRef = useRef(null)
  const isMapReady = useRef(false)
  const filteredPointsRef = useRef([])
  // renderKey removed - no longer needed

  useEffect(() => {
    if (!window.AMap) {
      console.error('AMap 未加载')
      return
    }

    console.log('开始初始化地图...')

    window.AMap.plugin(['AMap.MarkerCluster'], () => {
      console.log('MarkerCluster 插件加载完成')

      if (!mapRef.current) {
        console.error('mapRef.current 为空，无法初始化地图')
        return
      }

      const map = new window.AMap.Map(mapRef.current, {
        zoom: 11,
        center: [114.1694, 22.3193],
      })

      console.log('地图实例创建完成')

      mapInstance.current = map
      isMapReady.current = true
      window.__hkMapInstance = map  // 暴露给 MapPage 用于路线规划

      const handleSetCenter = (e) => {
        const { lng, lat } = e.detail
        const [gcjLng, gcjLat] = wgs84ToGcj02(lng, lat)
        map.setCenter([gcjLng, gcjLat])
      }
      window.addEventListener('map-set-center', handleSetCenter)

      map.on('click', (e) => {
        if (onMapClick) {
          onMapClick(e.lnglat.getLng(), e.lnglat.getLat())
        }
      })

      map._hkHandleSetCenter = handleSetCenter
    })

    return () => {
      if (infoWindowRef.current) {
        infoWindowRef.current.close()
      }
      if (rootRef.current) {
        rootRef.current.unmount()
        rootRef.current = null
      }
      if (mapInstance.current) {
        if (mapInstance.current._hkHandleSetCenter) {
          window.removeEventListener('map-set-center', mapInstance.current._hkHandleSetCenter)
        }
        mapInstance.current.destroy()
        mapInstance.current = null
        isMapReady.current = false
        window.__hkMapInstance = null
      }
    }
  }, [onMapClick])

  useEffect(() => {
    if (!mapInstance.current || !isMapReady.current) return
    if (!locations || locations.length === 0) return

    console.log('=== MapContainer Debug ===')
    console.log('locations count:', locations.length)

    // 销毁旧 cluster
    if (clusterInstance.current) {
      try {
        clusterInstance.current.setMap(null)
      } catch (e) {
        console.warn('MarkerCluster setMap(null) 失败:', e)
      }
      clusterInstance.current = null
    }
    if (infoWindowRef.current) {
      infoWindowRef.current.close()
    }
    if (rootRef.current) {
      rootRef.current.unmount()
      rootRef.current = null
    }

    let filtered = locations
    if (filter === 'favorites') {
      filtered = locations.filter((loc) => favorites.includes(loc.id))
    } else if (filter === 'checkins') {
      filtered = locations.filter((loc) => checkins.includes(loc.id))
    } else if (filter && filter.movieId) {
      filtered = locations.filter((loc) => loc.movie_id === filter.movieId)
    }

    console.log('filtered count:', filtered.length)

    const points = filtered
      .filter((loc) => {
        const valid = loc.longitude && loc.latitude &&
          typeof loc.longitude === 'number' && typeof loc.latitude === 'number' &&
          !isNaN(loc.longitude) && !isNaN(loc.latitude)
        return valid
      })
      .map((loc) => {
        const [gcjLng, gcjLat] = wgs84ToGcj02(loc.longitude, loc.latitude)

        let color = '#9CA3AF'
        if (checkins.includes(loc.id)) color = '#10B981'
        else if (favorites.includes(loc.id)) color = '#F59E0B'

        return {
          lnglat: [gcjLng, gcjLat],
          weight: 1,
          extData: { ...loc, color },
        }
      })

    console.log('points count:', points.length)

    // 保存当前筛选后的原始数据，供 fallback 使用（深拷贝，防止被 MarkerCluster 修改）
    filteredPointsRef.current = filtered.map((loc) => ({
      id: loc.id,
      longitude: loc.longitude,
      latitude: loc.latitude,
      extData: { ...loc },
    }))

    if (points.length > 0) {
      try {
        clusterInstance.current = new window.AMap.MarkerCluster(
          mapInstance.current,
          points,
          {
            gridSize: 60,
            renderClusterMarker: (context) => {
              if (!context || !context.marker) return
              try {
                const count = context.count || 0
                const size = count < 10 ? 40 : count < 100 ? 50 : 60
                const div = document.createElement('div')
                div.style.width = size + 'px'
                div.style.height = size + 'px'
                div.style.backgroundColor = '#8B2635'
                div.style.color = '#fff'
                div.style.borderRadius = '50%'
                div.style.display = 'flex'
                div.style.alignItems = 'center'
                div.style.justifyContent = 'center'
                div.style.fontSize = '14px'
                div.style.fontWeight = 'bold'
                div.style.border = '2px solid #fff'
                div.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)'
                div.innerText = String(count)
                context.marker.setContent(div)
                context.marker.setOffset(new window.AMap.Pixel(-size / 2, -size / 2))
              } catch (e) {
                console.error('renderClusterMarker 错误:', e)
              }
            },
            renderMarker: (context) => {
              if (!context || !context.marker) return
              try {
                // 使用 context.data[0].extData 获取数据（高德 JS API 2.0 标准方式）
                const data = (context.data && context.data[0] && context.data[0].extData) || {}
                const color = data.color || '#9CA3AF'

                const div = document.createElement('div')
                div.style.cssText = `
                  width: 14px;
                  height: 14px;
                  border-radius: 50%;
                  background: ${color};
                  border: 2px solid #fff;
                  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
                  cursor: pointer;
                `
                context.marker.setContent(div)
                context.marker.setOffset(new window.AMap.Pixel(-7, -7))

                // 在 renderMarker 内部绑定 click 事件
                context.marker.on('click', (e) => {
                  console.log('renderMarker click:', data.location_name)

                  if (infoWindowRef.current) infoWindowRef.current.close()
                  if (rootRef.current) {
                    rootRef.current.unmount()
                    rootRef.current = null
                  }

                  const contentDiv = document.createElement('div')
                  rootRef.current = createRoot(contentDiv)
                  rootRef.current.render(
                    <InfoWindowContent
                      location={data}
                      onClose={() => infoWindowRef.current?.close()}
                    />
                  )

                  const infoWindow = new window.AMap.InfoWindow({
                    content: contentDiv,
                    offset: new window.AMap.Pixel(0, -15),
                    autoMove: true,
                  })
                  infoWindow.open(mapInstance.current, e.target.getPosition())
                  infoWindowRef.current = infoWindow
                })
              } catch (e) {
                console.error('renderMarker 错误:', e)
              }
            },
          }
        )

        // 统一处理聚合点和单点点击
        clusterInstance.current.on('click', (e) => {
          const { clusterData, marker, lnglat } = e

          const handleFallback = (pos) => {
            const clickLng = pos.getLng ? pos.getLng() : pos.lng
            const clickLat = pos.getLat ? pos.getLat() : pos.lat
            const points = filteredPointsRef.current
            console.log('handleFallback: clickPos=', clickLng, clickLat, 'pointsCount=', points?.length)
            if (!points || points.length === 0) return

            let nearest = null
            let minDist = Infinity
            points.forEach((p) => {
              if (!p || !p.extData) return
              const [gcjLng, gcjLat] = wgs84ToGcj02(p.longitude, p.latitude)
              const dist = getDistance(clickLat, clickLng, gcjLat, gcjLng)
              if (dist < minDist) {
                minDist = dist
                nearest = p.extData
              }
            })

            if (!nearest) {
              console.log('fallback: 无匹配地点')
              return
            }
            console.log('cluster fallback:', nearest.location_name, '距离:', Math.round(minDist), '米')

            if (infoWindowRef.current) infoWindowRef.current.close()
            if (rootRef.current) {
              rootRef.current.unmount()
              rootRef.current = null
            }

            const contentDiv = document.createElement('div')
            rootRef.current = createRoot(contentDiv)
            rootRef.current.render(
              <InfoWindowContent
                location={nearest}
                onClose={() => infoWindowRef.current?.close()}
              />
            )

            const infoWindow = new window.AMap.InfoWindow({
              content: contentDiv,
              offset: new window.AMap.Pixel(0, -15),
              autoMove: true,
            })
            infoWindow.open(mapInstance.current, pos)
            infoWindowRef.current = infoWindow
          }

          // clusterData 为空时，使用 fallback
          if (!clusterData || clusterData.length === 0) {
            console.log('cluster.on(click): dataLen=0, 使用 fallback')
            handleFallback(lnglat || marker.getPosition())
            return
          }

          // 聚合点（多个）：放大地图
          if (clusterData.length > 1) {
            const zoom = mapInstance.current.getZoom()
            mapInstance.current.setZoomAndCenter(zoom + 2, marker.getPosition())
            return
          }

          // 单点：显示 InfoWindow
          const pointData = clusterData[0]
          const locationData = pointData?.extData

          if (!locationData) {
            console.error('点击单点但无数据:', e)
            handleFallback(lnglat || marker.getPosition())
            return
          }

          console.log('单点点击:', locationData.location_name)

          // 关闭旧窗口
          if (infoWindowRef.current) infoWindowRef.current.close()
          if (rootRef.current) {
            rootRef.current.unmount()
            rootRef.current = null
          }

          // 创建 React InfoWindow
          const contentDiv = document.createElement('div')
          rootRef.current = createRoot(contentDiv)
          rootRef.current.render(
            <InfoWindowContent
              location={locationData}
              onClose={() => infoWindowRef.current?.close()}
            />
          )

          const infoWindow = new window.AMap.InfoWindow({
            content: contentDiv,
            offset: new window.AMap.Pixel(0, -15),
            autoMove: true,
          })

          // 使用 marker 坐标或事件坐标
          const position = marker?.getPosition() || lnglat
          infoWindow.open(mapInstance.current, position)
          infoWindowRef.current = infoWindow
        })

        console.log('MarkerCluster 创建成功:', clusterInstance.current)
      } catch (e) {
        console.error('MarkerCluster 创建失败:', e)
      }

      setTimeout(() => {
        if (mapInstance.current) {
          mapInstance.current.setFitView(null, false, [60, 60, 60, 60])
          console.log('地图视野已调整')
        }
      }, 100)
    }

    console.log('========================')
  }, [locations, favorites, checkins, filter])

  useEffect(() => {
    if (!mapInstance.current || !isMapReady.current) return

    if (mockMarkerRef.current) {
      mockMarkerRef.current.setMap(null)
      mockMarkerRef.current = null
    }

    if (mockLocation) {
      const [gcjLng, gcjLat] = wgs84ToGcj02(mockLocation.lng, mockLocation.lat)
      const marker = new window.AMap.Marker({
        position: [gcjLng, gcjLat],
        content: `<div style="width:20px;height:20px;border-radius:50%;background:#3B82F6;border:3px solid #fff;box-shadow:0 0 0 4px rgba(59,130,246,0.3);animation:pulse 2s infinite;"></div>`,
        offset: new window.AMap.Pixel(-10, -10),
        zIndex: 100,
      })
      marker.setMap(mapInstance.current)
      mockMarkerRef.current = marker
      mapInstance.current.setCenter([gcjLng, gcjLat])
    }
  }, [mockLocation])

  // 处理从电影详情页跳转来的焦点位置
  useEffect(() => {
    if (!mapInstance.current || !isMapReady.current || !focusLocation) return
    if (!focusLocation.longitude || !focusLocation.latitude) return

    const [gcjLng, gcjLat] = wgs84ToGcj02(focusLocation.longitude, focusLocation.latitude)

    // 延迟 600ms 执行，确保主 effect 的 setFitView (100ms) 已完全完成
    const timer1 = setTimeout(() => {
      if (!mapInstance.current) return

      const currentZoom = mapInstance.current.getZoom()
      // MarkerCluster 在 zoom >= 14 时显示单个 Marker
      // 如果当前 zoom 已足够，只居中不缩放；否则放大到刚好显示单个 Marker
      const targetZoom = Math.max(currentZoom, 14)
      mapInstance.current.setZoomAndCenter(targetZoom, [gcjLng, gcjLat])
      console.log('焦点位置居中:', focusLocation.location_name, 'zoom:', currentZoom, '->', targetZoom)
    }, 600)

    // 延迟 900ms 打开 InfoWindow
    const timer2 = setTimeout(() => {
      if (!mapInstance.current) return

      if (infoWindowRef.current) {
        infoWindowRef.current.close()
      }
      if (rootRef.current) {
        rootRef.current.unmount()
        rootRef.current = null
      }

      const contentDiv = document.createElement('div')
      rootRef.current = createRoot(contentDiv)
      rootRef.current.render(
        <InfoWindowContent
          location={focusLocation}
          onClose={() => {
            if (infoWindowRef.current) {
              infoWindowRef.current.close()
            }
          }}
        />
      )

      const infoWindow = new window.AMap.InfoWindow({
        content: contentDiv,
        offset: new window.AMap.Pixel(0, -15),
        autoMove: true,
      })
      infoWindow.open(mapInstance.current, [gcjLng, gcjLat])
      infoWindowRef.current = infoWindow
    }, 900)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [focusLocation])

  return <div ref={mapRef} className="w-full h-full" />
}

export default MapContainer
