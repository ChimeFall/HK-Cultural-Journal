import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'

function SharePage() {
  const { id } = useParams()
  const [checkin, setCheckin] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCheckin() {
      try {
        const res = await fetch(`/api/checkins/${id}`)
        const json = await res.json()
        if (json.success) setCheckin(json.data)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchCheckin()
  }, [id])

  if (loading) return <div className="p-4 text-center">加载中...</div>
  if (!checkin) return <div className="p-4 text-center">打卡记录未找到</div>

  const locationName = checkin.location_name || ''
  const movieTitle = checkin.movie_title_hant || checkin.movie_title_hans || ''
  const note = checkin.note || ''
  const photoUrl = checkin.photo_path || ''
  const dateStr = new Date(checkin.checkin_time).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="min-h-screen bg-journal-paper p-4">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="p-6">
          <h1 className="text-2xl font-serif font-bold text-journal-stamp text-center mb-4">
            香港文化手账
          </h1>

          {photoUrl && (
            <div className="w-full aspect-[4/3] rounded-lg overflow-hidden mb-4">
              <img src={photoUrl} alt={locationName} className="w-full h-full object-cover" />
            </div>
          )}

          <div className="movie-bar mb-3">
            <h2 className="text-lg font-bold">{locationName}</h2>
            <p className="text-sm text-gray-500">《{movieTitle}》取景地</p>
          </div>

          {note && (
            <p className="text-sm text-gray-600 italic mb-4">"{note}"</p>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{dateStr}</span>
            <span className="text-xs text-gray-400">HK CULTURE JOURNAL</span>
          </div>
        </div>

        <div className="bg-journal-stamp p-4 text-center">
          <Link
            to="/"
            className="inline-block px-6 py-2 bg-white text-journal-stamp rounded-full text-sm font-medium"
          >
            打开应用探索更多取景地
          </Link>
        </div>
      </div>
    </div>
  )
}

export default SharePage
