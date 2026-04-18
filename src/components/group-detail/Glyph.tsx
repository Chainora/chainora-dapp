type UiGlyph = 'auction' | 'members' | 'shield' | 'clock' | 'coin' | 'spark' | 'back' | 'refresh' | 'timeline' | 'check' | 'x';

export function Glyph({ name, className = 'h-4 w-4' }: { name: UiGlyph; className?: string }) {
  if (name === 'auction') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
        <path d="M4 20h16" />
        <path d="m6 16 8-8 4 4-8 8H6z" />
        <path d="m13 7 2-2 4 4-2 2" />
      </svg>
    );
  }
  if (name === 'members') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
        <circle cx="8" cy="8.5" r="2.5" />
        <circle cx="16.5" cy="9.5" r="2" />
        <path d="M3.5 18.5c.8-2.3 2.5-3.5 4.5-3.5s3.7 1.2 4.5 3.5" />
        <path d="M13.5 18.5c.5-1.7 1.8-2.6 3.5-2.6s3 .9 3.5 2.6" />
      </svg>
    );
  }
  if (name === 'shield') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
        <path d="M12 3 5.5 6v5.4c0 4.4 2.9 8.3 6.5 9.6 3.6-1.3 6.5-5.2 6.5-9.6V6L12 3z" />
      </svg>
    );
  }
  if (name === 'clock') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.8v4.8l3 1.8" />
      </svg>
    );
  }
  if (name === 'coin') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
        <ellipse cx="12" cy="6.5" rx="6.5" ry="2.8" />
        <path d="M5.5 6.5v6c0 1.5 2.9 2.8 6.5 2.8s6.5-1.3 6.5-2.8v-6" />
      </svg>
    );
  }
  if (name === 'timeline') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
        <path d="M5 6h14M5 12h14M5 18h14" />
        <circle cx="8" cy="6" r="1.6" fill="currentColor" stroke="none" />
        <circle cx="13" cy="12" r="1.6" fill="currentColor" stroke="none" />
        <circle cx="17" cy="18" r="1.6" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (name === 'back') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
        <path d="M15 18 9 12l6-6" />
      </svg>
    );
  }
  if (name === 'refresh') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
        <path d="M20 11a8 8 0 1 0 2 5.2" />
        <path d="M20 4v7h-7" />
      </svg>
    );
  }
  if (name === 'check') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={className} aria-hidden="true">
        <path d="m5 13 4 4L19 7" />
      </svg>
    );
  }
  if (name === 'x') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={className} aria-hidden="true">
        <path d="m6 6 12 12M18 6 6 18" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="m12 4 2.2 4.8L19 9.4l-3.5 3.4.9 4.8L12 15.8 7.6 17.6l.9-4.8L5 9.4l4.8-.6L12 4z" />
    </svg>
  );
}

