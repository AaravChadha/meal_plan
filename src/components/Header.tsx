'use client';

interface HeaderProps {
  title: string;
  date: string;
  onDateChange: (date: string) => void;
}

export default function Header({ title, date, onDateChange }: HeaderProps) {
  const changeDate = (days: number) => {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + days);
    onDateChange(d.toISOString().slice(0, 10));
  };

  const isToday = date === new Date().toISOString().slice(0, 10);

  return (
    <header className="header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <h2 className="header-title">{title}</h2>
        {isToday && (
          <span style={{
            fontSize: '12px',
            fontWeight: 600,
            padding: '3px 10px',
            borderRadius: '12px',
            background: 'rgba(52, 211, 153, 0.15)',
            color: 'var(--accent-emerald)'
          }}>
            Today
          </span>
        )}
      </div>
      <div className="header-date">
        <button className="date-nav-btn" onClick={() => changeDate(-1)}>←</button>
        <input
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
        />
        <button className="date-nav-btn" onClick={() => changeDate(1)}>→</button>
        {!isToday && (
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => onDateChange(new Date().toISOString().slice(0, 10))}
          >
            Today
          </button>
        )}
      </div>
    </header>
  );
}
