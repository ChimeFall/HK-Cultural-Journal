import { useState, useMemo } from 'react'

function MovieFootprintView({ checkins, lang, onDelete }) {
  const [expandedMovie, setExpandedMovie] = useState(null)

  const grouped = useMemo(() => {
    const map = {}
    checkins.forEach((c) => {
      const key = c.movie_title_hant || c.movie_title_hans || c.movieTitle || '未知'
      if (!map[key]) {
        map[key] = {
          title: key,
          thumbnail: c.thumbnail_url || c.thumbnailUrl || '',
          items: [],
          totalLocations: c.location_count || c.locationCount || c.items?.length || 1,
        }
      }
      map[key].items.push(c)
    })
    return Object.values(map)
  }, [checkins])

  return (
    <div className="space-y-4">
      {grouped.map((movie) => {
        const checkedCount = movie.items.length
        const totalCount = movie.totalLocations || checkedCount
        const progress = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0
        const isExpanded = expandedMovie === movie.title

        return (
          <div key={movie.title} className="bg-white rounded-lg shadow overflow-hidden">
            <div
              className="flex items-center gap-3 p-3 cursor-pointer"
              onClick={() => setExpandedMovie(isExpanded ? null : movie.title)}
            >
              <div className="w-14 h-14 bg-gray-200 rounded flex-shrink-0 overflow-hidden">
                {movie.thumbnail ? (
                  <img src={movie.thumbnail} alt={movie.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl">🎬</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm truncate">{movie.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  已打卡 {checkedCount}/{totalCount} 个取景地
                </p>
                <div className="mt-1.5 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-journal-stamp h-2 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              <span className="text-gray-400 text-lg">{isExpanded ? '▲' : '▼'}</span>
            </div>

            {isExpanded && (
              <div className="px-3 pb-3 grid grid-cols-3 gap-2">
                {movie.items.map((item) => (
                  <div key={item.id} className="text-center relative group">
                    {item.photo_path || item.photoUrl ? (
                      <img
                        src={item.photo_path || item.photoUrl}
                        alt={item.location_name || item.locationName}
                        className="w-full h-20 object-cover rounded"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-20 bg-gray-200 rounded flex items-center justify-center">
                        <span className="text-xl">📍</span>
                      </div>
                    )}
                    <p className="text-xs text-gray-600 mt-1 truncate">
                      {item.location_name || item.locationName}
                    </p>
                    {onDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onDelete(item.id)
                        }}
                        className="absolute top-1 right-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        删除
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default MovieFootprintView
