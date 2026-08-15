import { useState, useRef, useEffect, useCallback } from 'react'
import useStore from '../store/useStore'
import { getDeviceId } from '../utils/deviceId'

async function compressImage(file, maxWidth = 1200, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.src = objectUrl
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const scale = Math.min(1, maxWidth / img.width)
      canvas.width = img.width * scale
      canvas.height = img.height * scale
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl)
          if (!blob) {
            reject(new Error('图片压缩失败，无法生成 blob'))
            return
          }
          resolve(new File([blob], file.name, { type: 'image/jpeg' }))
        },
        'image/jpeg',
        quality
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('图片加载失败'))
    }
  })
}

// Haversine 公式计算两点间距离（米）
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

function CheckinForm({ location: initialLocation, onSuccess, onCancel, fallbackLocations = [], requireLocation = false }) {
  const { fetchCheckinRecords, isTestMode, favorites, setNewlyUnlockedBadges, setNearbyLocations, fetchAchievements } = useStore()
  const [location, setLocation] = useState(initialLocation)
  const [photo, setPhoto] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const handleFileChange = useCallback(async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过 5MB')
      return
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    setPhoto(file)
  }, [previewUrl])

  // 定位验证：检查用户是否在打卡地点 100 米范围内
  const validateLocation = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!requireLocation || isTestMode) {
        resolve(true)
        return
      }

      if (!location || !location.latitude || !location.longitude) {
        reject(new Error('打卡地点坐标无效'))
        return
      }

      if (!navigator.geolocation) {
        reject(new Error('您的浏览器不支持地理定位'))
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          const dist = getDistance(latitude, longitude, location.latitude, location.longitude)
          console.log('定位验证：用户与打卡地点距离', Math.round(dist), '米')

          if (dist <= 100) {
            resolve(true)
          } else {
            reject(new Error(`你距离该地点约 ${Math.round(dist)} 米，超过 100 米限制，无法打卡。请到达地点附近后再试，或开启测试模式。`))
          }
        },
        (err) => {
          let msg = '无法获取你的位置'
          if (err.code === 1) msg = '定位权限被拒绝，请在浏览器设置中允许定位权限'
          else if (err.code === 2) msg = 'GPS 位置不可用'
          else if (err.code === 3) msg = 'GPS 定位超时'
          reject(new Error(msg))
        },
        {
          enableHighAccuracy: true,
          maximumAge: 30000,
          timeout: 10000,
        }
      )
    })
  }, [requireLocation, isTestMode, location])

  const handleSubmit = useCallback(async () => {
    if (!location) {
      alert('请选择打卡地点')
      return
    }

    setSubmitting(true)
    try {
      // 定位验证
      await validateLocation()

      let compressedFile = photo
      if (photo) {
        compressedFile = await compressImage(photo)
      }

      const formData = new FormData()
      if (compressedFile) formData.append('photo', compressedFile)
      formData.append('note', note)
      formData.append('location_id', location.id)

      const res = await fetch('/api/checkins', {
        method: 'POST',
        headers: { 'x-device-id': getDeviceId() },
        body: formData,
      })
      const json = await res.json()
      if (json.success) {
        await fetchCheckinRecords()
        await fetchAchievements()
        if (json.data.newly_unlocked_badges && json.data.newly_unlocked_badges.length > 0) {
          setNewlyUnlockedBadges(json.data.newly_unlocked_badges)
        }
        if (json.data.nearby_locations && json.data.nearby_locations.length > 0) {
          setNearbyLocations(json.data.nearby_locations)
        }
        if (isTestMode) alert('打卡成功（测试数据）')
        onSuccess()
      } else {
        alert(json.message || '打卡失败')
      }
    } catch (e) {
      if (e.message && e.message.includes('米')) {
        alert(e.message)
      } else {
        alert('网络错误，打卡失败')
      }
      console.error(e)
    } finally {
      setSubmitting(false)
    }
  }, [location, photo, note, fetchCheckinRecords, isTestMode, onSuccess, validateLocation])

  const showFallback = !initialLocation && fallbackLocations.length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white w-full sm:w-[420px] sm:rounded-2xl rounded-t-2xl p-5 z-50 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-journal-stamp mb-4">
          {initialLocation ? `打卡：${initialLocation.location_name}` : '补打卡'}
        </h3>

        {requireLocation && !isTestMode && (
          <div className="mb-3 p-2 bg-blue-50 text-blue-700 text-xs rounded-lg">
            📍 需要定位验证：你需在地点 100 米范围内才能打卡
          </div>
        )}

        {showFallback && (
          <div className="mb-4">
            <label className="text-sm text-gray-600 mb-1 block">选择地点</label>
            <select
              value={location?.id || ''}
              onChange={(e) => {
                const loc = fallbackLocations.find((l) => l.id === e.target.value)
                setLocation(loc || null)
              }}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm"
            >
              <option value="">请选择...</option>
              {fallbackLocations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.location_name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="mb-4">
          <label className="text-sm text-gray-600 mb-1 block">拍照</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 text-sm hover:border-journal-stamp hover:text-journal-stamp transition"
          >
            {previewUrl ? '更换照片' : '📷 点击拍照或选择照片'}
          </button>
          {previewUrl && (
            <img
              src={previewUrl}
              alt="preview"
              className="mt-3 w-full h-48 object-cover rounded-lg"
            />
          )}
        </div>

        <div className="mb-5">
          <label className="text-sm text-gray-600 mb-1 block">感想</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="在这里，我想起了电影里的那句台词..."
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-journal-gold"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={submitting || !location}
            className="flex-1 py-3 rounded-xl bg-journal-stamp text-white font-medium text-sm disabled:opacity-50"
          >
            {submitting ? '提交中...' : '提交打卡'}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl bg-gray-200 text-gray-700 font-medium text-sm"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  )
}

export default CheckinForm
