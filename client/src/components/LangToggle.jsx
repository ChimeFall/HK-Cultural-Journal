import useStore from '../store/useStore'

function LangToggle() {
  const { lang, toggleLang } = useStore()

  return (
    <button
      onClick={toggleLang}
      className="px-3 py-1 text-sm rounded-full border border-journal-stamp text-journal-stamp hover:bg-journal-stamp hover:text-white transition"
    >
      {lang === 'hant' ? '繁' : '简'}
    </button>
  )
}

export default LangToggle
