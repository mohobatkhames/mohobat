import { THEMES, activeTheme } from '../lib/constants';
import { useStore } from '../context/Store';

export default function ThemeSwitch({ crescent = false }) {
  const { data, setTheme, setMode } = useStore();
  const theme = activeTheme(data.theme);
  const night = data.mode === 'night';

  return (
    <div className="flex flex-wrap items-center gap-2">
      {THEMES.map((item) => (
        <button
          key={item.id}
          type="button"
          title={item.label}
          aria-label={item.label}
          aria-pressed={theme === item.id}
          onClick={() => setTheme(item.id)}
          className="h-7 w-7 rounded-full border-2 border-white shadow"
          style={{ background: item.swatch, outline: theme === item.id ? '2px solid var(--text)' : 'none' }}
        />
      ))}
      {crescent ? (
        <button
          type="button"
          title={night ? 'ليلي' : 'نهاري'}
          aria-label={night ? 'الوضع الليلي' : 'الوضع النهاري'}
          aria-pressed={night}
          onClick={() => setMode(night ? 'day' : 'night')}
          className="grid h-7 w-7 place-items-center rounded-full border-2 border-white shadow"
          style={{ background: night ? '#10243f' : '#fff8ee', color: night ? '#f6e7a8' : '#0b3a66' }}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
            <path fill="currentColor" d="M15.2 2.4a8.6 8.6 0 1 0 6.4 13.2A7.1 7.1 0 0 1 15.2 2.4z" />
          </svg>
        </button>
      ) : (
        <>
          <button className={night ? 'btn-ghost' : 'btn-primary'} type="button" aria-pressed={!night} onClick={() => setMode('day')}>نهاري</button>
          <button className={night ? 'btn-primary' : 'btn-ghost'} type="button" aria-pressed={night} onClick={() => setMode('night')}>ليلي</button>
        </>
      )}
    </div>
  );
}
