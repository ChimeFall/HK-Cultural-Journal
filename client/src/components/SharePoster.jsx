import { useState, useRef, useCallback, useEffect } from 'react'
import html2canvas from 'html2canvas'

function SharePoster({ checkin, onClose }) {
  const [dataUrl, setDataUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const posterRef = useRef(null)

  const locationName = checkin.location_name || checkin.locationName || ''
  const movieTitle = checkin.movie_title_hant || checkin.movieTitle || ''
  const note = checkin.note || ''
  const photoUrl = checkin.photo_path || checkin.photoUrl || ''
  const dateStr = new Date(checkin.checkin_time || checkin.checkinTime).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // 组件挂载后自动生成海报
  useEffect(() => {
    generatePoster()
  }, [])

  const generatePoster = useCallback(async () => {
    if (!posterRef.current) return
    setLoading(true)
    try {
      const canvas = await html2canvas(posterRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#F5F0E1',
        logging: false,
      })
      const url = canvas.toDataURL('image/png')
      setDataUrl(url)
    } catch (e) {
      console.error('海报生成失败:', e)
      alert('海报生成失败，请重试')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleDownload = () => {
    if (!dataUrl) return
    const link = document.createElement('a')
    link.download = `hk-journal-${Date.now()}.png`
    link.href = dataUrl
    link.click()
  }

  const handleShare = async () => {
    if (!dataUrl) return
    try {
      const blob = await (await fetch(dataUrl)).blob()
      const file = new File([blob], 'hk-journal.png', { type: 'image/png' })
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: '我的香港文化手账',
          text: `我在${locationName}打卡了《${movieTitle}》取景地`,
          files: [file],
        })
      } else {
        alert('您的浏览器不支持直接分享图片，已为您保存图片')
        handleDownload()
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.error(e)
        handleDownload()
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white w-full sm:w-auto rounded-t-2xl sm:rounded-2xl p-5 z-50 max-h-[95vh] overflow-y-auto">
        <div
          ref={posterRef}
          style={{
            width: 340,
            height: 540,
            backgroundColor: '#F5F0E1',
            position: 'relative',
            padding: 20,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <h2
            style={{
              fontFamily: 'serif',
              color: '#8B2635',
              fontSize: 20,
              fontWeight: 'bold',
              textAlign: 'center',
              marginBottom: 12,
            }}
          >
            香港文化手账
          </h2>

          <div
            style={{
              width: '100%',
              height: 280,
              borderRadius: 8,
              overflow: 'hidden',
              backgroundColor: '#e5e5e5',
              marginBottom: 12,
            }}
          >
            {photoUrl ? (
              <img
                src={photoUrl}
                alt="checkin"
                crossOrigin="anonymous"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#999',
                  fontSize: 14,
                }}
              >
                📷 暂无照片
              </div>
            )}
          </div>

          <div
            style={{
              borderLeft: '4px solid #D4AF37',
              paddingLeft: 12,
              marginBottom: 8,
            }}
          >
            <p style={{ fontSize: 15, fontWeight: 'bold', color: '#1f2937' }}>
              {locationName}
            </p>
            <p style={{ fontSize: 12, color: '#666' }}>《{movieTitle}》取景地</p>
          </div>

          {note && (
            <p
              style={{
                fontSize: 13,
                color: '#4b5563',
                fontStyle: 'italic',
                lineHeight: 1.4,
                marginBottom: 8,
                flex: 1,
              }}
            >
              "{note}"
            </p>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'flex-end',
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                backgroundColor: '#8B2635',
                color: '#fff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 'bold',
                transform: 'rotate(-12deg)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                padding: 6,
                position: 'relative',
              }}
            >
              <span>{dateStr.split('年')[1]?.split('月')[0] || ''}月</span>
              <span style={{ fontSize: 22 }}>{dateStr.split('日')[0]?.split('月')[1] || ''}</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex gap-3 mt-4">
            <button
              disabled
              className="flex-1 py-3 rounded-xl bg-gray-300 text-white font-medium text-sm"
            >
              正在生成海报...
            </button>
          </div>
        ) : (
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleDownload}
              className="flex-1 py-3 rounded-xl bg-journal-stamp text-white font-medium text-sm"
            >
              保存海报
            </button>
            <button
              onClick={handleShare}
              className="flex-1 py-3 rounded-xl bg-journal-gold text-white font-medium text-sm"
            >
              分享海报
            </button>
            <button
              onClick={onClose}
              className="px-4 py-3 rounded-xl bg-gray-200 text-gray-700 font-medium text-sm"
            >
              关闭
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default SharePoster
