import type { ReactNode } from 'react';

import type { CreateGroupIconName, DurationForm } from './types';

function CreateGroupIcon({ name, className = 'h-4 w-4' }: { name: CreateGroupIconName; className?: string }) {
  switch (name) {
    case 'basic':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
          <path d="M4 6h16M4 12h16M4 18h10" />
        </svg>
      );
    case 'name':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
          <path d="M5 5h14v14H5z" />
          <path d="M8 9h8M8 13h8" />
        </svg>
      );
    case 'description':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
          <path d="M5 6h14M5 10h14M5 14h14M5 18h9" />
        </svg>
      );
    case 'image':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <circle cx="9" cy="10" r="1.5" />
          <path d="m20 16-5-4-5 5-2-2-4 4" />
        </svg>
      );
    case 'reputation':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
          <path d="M12 3 6 5v6c0 4 2.4 7 6 10 3.6-3 6-6 6-10V5z" />
          <path d="m12 8 1.3 2.5 2.7.4-2 1.9.5 2.7-2.5-1.3-2.5 1.3.5-2.7-2-1.9 2.7-.4z" />
        </svg>
      );
    case 'timing':
    case 'periodDuration':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v5l3 2" />
        </svg>
      );
    case 'auctionWindow':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
          <path d="m6 7 9 9M14 5l5 5M3 10l5 5" />
          <path d="M10 21h10" />
        </svg>
      );
    case 'contributionWindow':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
          <path d="M3 12h8a2 2 0 0 1 0 4H7" />
          <path d="M7 16v4" />
          <circle cx="17" cy="10" r="4" />
          <path d="M17 8v4M15 10h4" />
        </svg>
      );
    case 'finance':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <circle cx="12" cy="12" r="2" />
          <path d="M7 12h.01M17 12h.01" />
        </svg>
      );
    case 'paymentToken':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
          <rect x="3" y="7" width="18" height="10" rx="2" />
          <path d="M16 10h5v4h-5a2 2 0 0 1 0-4Z" />
        </svg>
      );
    case 'amount':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
          <ellipse cx="12" cy="7" rx="5" ry="2.5" />
          <path d="M7 7v5c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V7" />
        </svg>
      );
    case 'members':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
          <circle cx="9" cy="9" r="2.5" />
          <circle cx="16" cy="9" r="2.5" />
          <path d="M4 18c.8-2.4 2.6-3.6 5-3.6s4.2 1.2 5 3.6" />
          <path d="M12 18c.7-2.3 2.3-3.4 4-3.4 1.7 0 3.3 1.1 4 3.4" />
        </svg>
      );
    case 'decimals':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
          <path d="M7 4 5 20M14 4l-2 16M4 10h16M3 15h16" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
          <path d="M4 8h16M4 12h16M4 16h10" />
        </svg>
      );
  }
}

export function IconBadge({
  icon,
  tone = 'bg-slate-100 text-slate-600',
}: {
  icon: CreateGroupIconName;
  tone?: string;
}) {
  return (
    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md ${tone}`}>
      <CreateGroupIcon name={icon} />
    </span>
  );
}

export function FieldLabel({
  htmlFor,
  icon,
  children,
}: {
  htmlFor?: string;
  icon: CreateGroupIconName;
  children: ReactNode;
}) {
  const content = (
    <span className="inline-flex items-center gap-2">
      <IconBadge icon={icon} />
      <span>{children}</span>
    </span>
  );

  if (htmlFor) {
    return (
      <label htmlFor={htmlFor} className="mb-2 block text-sm font-semibold text-slate-700">
        {content}
      </label>
    );
  }

  return <p className="mb-2 text-sm font-semibold text-slate-700">{content}</p>;
}

export function DurationInput(props: {
  label: string;
  iconName: CreateGroupIconName;
  value: DurationForm;
  helper: string;
  inputHint: string;
  error?: string;
  onChange: (next: DurationForm) => void;
}) {
  const update = (field: keyof DurationForm, nextValue: string) => {
    props.onChange({
      ...props.value,
      [field]: nextValue,
    });
  };

  const updateDigitsOnly = (field: keyof DurationForm, rawValue: string) => {
    update(field, rawValue.replace(/[^\d]/g, ''));
  };

  return (
    <div>
      <FieldLabel icon={props.iconName}>{props.label}</FieldLabel>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <div className="relative">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={props.value.days}
            onChange={event => updateDigitsOnly('days', event.target.value)}
            placeholder={`${props.inputHint}`}
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 pr-9 text-slate-900 outline-none ring-sky-200 transition focus:ring"
          />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-500">days</span>
        </div>
        <div className="relative">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={props.value.hours}
            onChange={event => updateDigitsOnly('hours', event.target.value)}
            placeholder={`${props.inputHint}`}
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 pr-9 text-slate-900 outline-none ring-sky-200 transition focus:ring"
          />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-500">hours</span>
        </div>
        <div className="relative">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={props.value.minutes}
            onChange={event => updateDigitsOnly('minutes', event.target.value)}
            placeholder={`${props.inputHint}`}
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 pr-11 text-slate-900 outline-none ring-sky-200 transition focus:ring"
          />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-500">mins</span>
        </div>
        <div className="relative">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={props.value.seconds}
            onChange={event => updateDigitsOnly('seconds', event.target.value)}
            placeholder={`${props.inputHint}`}
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 pr-11 text-slate-900 outline-none ring-sky-200 transition focus:ring"
          />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-500">secs</span>
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-500">{props.helper}</p>
      {props.error ? <p className="mt-1 text-sm text-rose-600">{props.error}</p> : null}
    </div>
  );
}
