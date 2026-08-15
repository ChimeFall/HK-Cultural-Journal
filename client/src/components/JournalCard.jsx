function JournalCard({ photoUrl, locationName, movieTitle, note, checkinTime, onShare, onDelete }) {
  return (
    <div className="photo-card relative">
      <div className="w-full aspect-[4/3] overflow-hidden rounded mb-2">
        <img src={photoUrl} alt={locationName} className="w-full h-full object-cover" loading="lazy" />
      </div>
      <div className="movie-bar mb-1">
        <h4 className="font-bold text-sm">{locationName}</h4>
        <p className="text-xs text-gray-500">{movieTitle}</p>
      </div>
      {note && <p className="text-xs text-gray-600 mt-1">{note}</p>}
      <div className="flex items-center justify-between mt-1">
        <p className="text-[10px] text-gray-400">
          {new Date(checkinTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
        <div className="flex gap-1">
          {onShare && (
            <button
              onClick={onShare}
              className="text-[10px] px-2 py-1 rounded-full bg-journal-stamp text-white"
            >
              生成海报
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="text-[10px] px-2 py-1 rounded-full bg-red-500 text-white"
            >
              删除
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default JournalCard
