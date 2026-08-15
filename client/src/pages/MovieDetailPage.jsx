import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import useStore from '../store/useStore'

function MovieDetailPage() {
  const { id } = useParams()
  const { lang } = useStore()
  const [movie, setMovie] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchMovie() {
      try {
        const res = await fetch(`/api/movies/${id}`)
        const json = await res.json()
        if (json.success) setMovie(json.data)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchMovie()
  }, [id])

  if (loading) return <div className="p-4 text-center">加载中...</div>
  if (!movie) return <div className="p-4 text-center">电影未找到</div>

  const title = lang === 'hant' ? movie.title_hant : movie.title_hans
  const abstract = lang === 'hant' ? movie.abstract_hant : movie.abstract_hans
  const actors = lang === 'hant' ? movie.actors_hant : movie.actors_hans

  return (
    <div className="p-4">
      <Link to="/" className="text-sm text-gray-500 hover:text-journal-stamp mb-4 inline-block">
        ← 返回列表
      </Link>

      <div className="bg-white rounded-lg shadow overflow-hidden mb-4">
        <div className="h-48 bg-gray-200 flex items-center justify-center">
          {(() => {
            const posterUrl = movie.work_post_url || movie.thumbnail_url
            return posterUrl ? (
              <img
                src={posterUrl}
                alt={title}
                className="w-full h-full object-cover"
                onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<span class="text-6xl">🎬</span>' }}
              />
            ) : (
              <span className="text-6xl">🎬</span>
            )
          })()}
        </div>
        <div className="p-4">
          <h1 className="text-xl font-bold mb-2">{title}</h1>
          <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-3">
            <span>{movie.year}</span>
            <span>·</span>
            <span>{movie.director}</span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed mb-3">{abstract}</p>
          {actors && (
            <p className="text-xs text-gray-500">
              <span className="font-semibold">演员：</span>
              {actors.split(';').slice(0, 5).join('、')}
            </p>
          )}
        </div>
      </div>

      <h2 className="text-lg font-bold mb-3">
        {lang === 'hant' ? '取景地' : '取景地'} ({movie.locations?.length || 0})
      </h2>

      <div className="space-y-3">
        {movie.locations?.map((loc) => (
          <Link
            key={loc.id}
            to={`/map?location=${loc.id}`}
            className="block bg-white rounded-lg shadow p-3 hover:shadow-md transition"
          >
            <div className="flex gap-3">
              <div className="w-20 h-20 bg-gray-200 rounded flex-shrink-0 flex items-center justify-center overflow-hidden">
                {loc.thumbnail_url ? (
                  <img src={loc.thumbnail_url} alt={loc.location_name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">📍</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm truncate">{loc.location_name}</h3>
                <p className="text-xs text-gray-500 mt-1">{loc.district}</p>
                {loc.scene_desc && (
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">{loc.scene_desc}</p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default MovieDetailPage
