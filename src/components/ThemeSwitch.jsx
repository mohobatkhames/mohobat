import { THEMES, activeTheme } from '../lib/constants';
import { useStore } from '../context/Store';

export default function ThemeSwitch() {
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
      <button className={night ? 'btn-ghost' : 'btn-primary'} type="button" aria-pressed={!night} onClick={() => setMode('day')}>نهاري</button>
      <button className={night ? 'btn-primary' : 'btn-ghost'} type="button" aria-pressed={night} onClick={() => setMode('night')}>ليلي</button>
    </div>
  );
}
