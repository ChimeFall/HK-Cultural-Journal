import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import useStore from '../store/useStore'
import LangToggle from '../components/LangToggle'

function HomePage({ workType }) {
  const { lang, searchQuery, setSearchQuery, selectedDistrict, setSelectedDistrict, selectedYear, setSelectedYear } = useStore()
  const [movies, setMovies] = useState([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [districts, setDistricts] = useState([])
  const [years, setYears] = useState([])
  const [loading, setLoading] = useState(false)

  const activeWorkType = workType || 'Film'

  const fetchMovies = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    params.append('page', page)
    params.append('limit', 20)
    params.append('work_type', activeWorkType)
    if (selectedDistrict) params.append('district', selectedDistrict)
    if (selectedYear) params.append('year', selectedYear)
    if (searchQuery) params.append('search', searchQuery)

    try {
      const res = await fetch(`/api/movies?${params.toString()}`)
      const json = await res.json()
      if (json.success) {
        setMovies(json.data.items)
        setTotalPages(json.data.total_pages)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [page, selectedDistrict, selectedYear, searchQuery, activeWorkType])

  const fetchFilters = useCallback(async () => {
    try {
      const [dRes, yRes] = await Promise.all([
        fetch('/api/districts'),
        fetch(`/api/movies?limit=1000&work_type=${activeWorkType}`),
      ])
      const dJson = await dRes.json()
      if (dJson.success) setDistricts(dJson.data)

      const yJson = await yRes.json()
      if (yJson.success) {
        const uniqueYears = [...new Set(yJson.data.items.map((m) => m.year))].filter(Boolean).sort((a, b) => b - a)
        setYears(uniqueYears)
      }
    } catch (e) {
      console.error(e)
    }
  }, [activeWorkType])

  useEffect(() => {
    fetchMovies()
  }, [fetchMovies])

  useEffect(() => {
    fetchFilters()
  }, [fetchFilters])

  useEffect(() => {
    setPage(1)
  }, [selectedDistrict, selectedYear, searchQuery])

  const isMusic = activeWorkType === 'Music'
  const pageTitle = isMusic ? '🎵 音乐足迹' : '🎬 电影足迹'
  const searchPlaceholder = isMusic ? '搜索歌曲或艺术家...' : '搜索电影或导演...'

  // 当 workType=Music 时隐藏 year/district 过滤器（音乐数据可能没有这些字段）

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-journal-stamp">香港文化手账</h1>
        <div className="flex items-center gap-2">
          <Link to="/map" className="text-sm px-3 py-1.5 rounded-full bg-white text-journal-stamp border border-journal-stamp">
            🗺️ 地图
          </Link>
          <Link to="/journal" className="text-sm px-3 py-1.5 rounded-full bg-white text-journal-stamp border border-journal-stamp">
            📔 手账
          </Link>
          <LangToggle />
        </div>
      </div>

      {/* 电影/音乐 Tab */}
      <div className="flex mb-4 bg-white rounded-lg p-1 shadow-sm">
        <Link
          to="/"
          className={`flex-1 text-center py-2 rounded-md text-sm font-medium transition ${
            !isMusic ? 'bg-journal-stamp text-white' : 'text-gray-500'
          }`}
        >
          🎬 电影
        </Link>
        <Link
          to="/music"
          className={`flex-1 text-center py-2 rounded-md text-sm font-medium transition ${
            isMusic ? 'bg-journal-stamp text-white' : 'text-gray-500'
          }`}
        >
          🎵 音乐
        </Link>
      </div>

      <div className="mb-4 space-y-2">
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-journal-gold"
        />
        <div className="flex gap-2">
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm"
          >
            <option value="">{lang === 'hant' ? '全部区域' : '全部区域'}</option>
            {districts.map((d) => (
              <option key={d.district} value={d.district}>
                {d.district} ({d.location_count})
              </option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm"
          >
            <option value="">{lang === 'hant' ? '全部年份' : '全部年份'}</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">加载中...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            {movies.map((movie) => (
              <Link
                key={movie.id}
                to={`/movies/${movie.id}`}
                className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition relative"
              >
                <div className="h-32 bg-gray-200 flex items-center justify-center">
                  {(() => {
                    const posterUrl = !isMusic && movie.work_post_url ? movie.work_post_url : movie.thumbnail_url
                    return posterUrl ? (
                      <img
                        src={posterUrl}
                        alt={movie.title_hant}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = `<span class="text-4xl">${isMusic ? '🎵' : '🎬'}</span>` }}
                      />
                    ) : (
                      <span className="text-4xl">{isMusic ? '🎵' : '🎬'}</span>
                    )
                  })()}
                </div>
                {/* work_type 标签 */}
                <span className="absolute top-1 right-1 bg-white/80 rounded-full px-1.5 py-0.5 text-[10px] font-medium">
                  {movie.work_type === 'Music' ? '🎵' : '🎬'}
                </span>
                <div className="p-3">
                  <h3 className="font-bold text-sm line-clamp-1">
                    {lang === 'hant' ? movie.title_hant : movie.title_hans}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {movie.year} · {movie.director}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {movie.location_count} {lang === 'hant' ? '个取景地' : '個取景地'}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          <div className="flex justify-center items-center gap-4 mt-6">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-4 py-2 rounded bg-white border border-gray-300 disabled:opacity-50"
            >
              上一页
            </button>
            <span className="text-sm text-gray-600">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-4 py-2 rounded bg-white border border-gray-300 disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default HomePage
