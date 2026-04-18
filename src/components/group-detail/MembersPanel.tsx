import { useState } from 'react';

import { Glyph } from './Glyph';
import type { MemberIdentityView } from './types';

type MembersPanelProps = {
  members: MemberIdentityView[];
};

const avatarTones = [
  'bg-blue-100 text-blue-700 ring-blue-200',
  'bg-emerald-100 text-emerald-700 ring-emerald-200',
  'bg-amber-100 text-amber-700 ring-amber-200',
  'bg-fuchsia-100 text-fuchsia-700 ring-fuchsia-200',
  'bg-cyan-100 text-cyan-700 ring-cyan-200',
  'bg-rose-100 text-rose-700 ring-rose-200',
];

const pickAvatarTone = (seed: string): string => {
  if (!seed) {
    return avatarTones[0];
  }

  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return avatarTones[hash % avatarTones.length];
};

const avatarInitial = (member: MemberIdentityView): string => {
  const label = member.username.trim() || member.initAddress.trim();
  const normalized = label.replace('.init', '').trim();
  return normalized ? normalized[0].toUpperCase() : '?';
};

export function MembersPanel({ members }: MembersPanelProps) {
  const [copiedAddress, setCopiedAddress] = useState('');

  const handleCopy = async (initAddress: string) => {
    try {
      await navigator.clipboard.writeText(initAddress);
      setCopiedAddress(initAddress);
      window.setTimeout(() => {
        setCopiedAddress(previous => (previous === initAddress ? '' : previous));
      }, 1500);
    } catch {
      setCopiedAddress('');
    }
  };

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="inline-flex items-center gap-2 text-lg font-bold text-slate-900">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
            <Glyph name="members" className="h-4 w-4" />
          </span>
          Members ({members.length})
        </h2>
      </div>

      <div className="space-y-2">
        {members.map((member, index) => (
          <div
            key={member.address}
            title={member.initAddress}
            className="group flex items-center justify-between rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white px-3 py-2 text-sm text-slate-700 transition hover:border-blue-200 hover:bg-blue-50/40"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
                {index + 1}
              </span>
              {member.avatarUrl ? (
                <img
                  src={member.avatarUrl}
                  alt={`${member.displayLabel} avatar`}
                  className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-slate-200"
                />
              ) : (
                <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ring-1 ${pickAvatarTone(member.address)}`}>
                  {avatarInitial(member)}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {member.displayLabel}
                </p>
                <p className="truncate font-mono text-xs text-slate-500" title={member.initAddress}>
                  {member.initAddress}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  void handleCopy(member.initAddress);
                }}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                title="Copy init address"
              >
                {copiedAddress === member.initAddress ? 'Copied' : 'Copy'}
              </button>
              {member.isCurrentUser ? (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">You</span>
              ) : null}
            </div>
          </div>
        ))}
        {members.length === 0 ? (
          <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-500">No members found yet.</p>
        ) : null}
      </div>
    </article>
  );
}
