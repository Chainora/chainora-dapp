import type { ChangeEvent } from 'react';

import { Button } from '../../../components/ui/Button';
import type { FieldErrors, FormState } from '../types';
import { SidePreview, type SidePreviewRow } from './SidePreview';

type Step1BasicProps = {
  form: FormState;
  errors: FieldErrors;
  setField: (field: keyof FormState, value: string) => void;
  isUploadingGroupImage: boolean;
  onGroupImageChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void> | void;
  ownerAddress: string | null;
  ownerLabel: string;
};

const cardStyle = {
  background: 'var(--ink-2)',
  border: '1px solid var(--ink-5)',
  borderRadius: 'var(--r-xl)',
  padding: 28,
} as const;

const innerSurfaceStyle = {
  background: 'var(--ink-1)',
  border: '1px solid var(--ink-5)',
  borderRadius: 'var(--r-md)',
} as const;

const ownerCardStyle = {
  ...innerSurfaceStyle,
  padding: '10px 12px',
} as const;

const avatarStyle = {
  background: 'linear-gradient(135deg, var(--signal-400), var(--arc-400))',
} as const;

const truncateAddress = (raw: string | null): string => {
  if (!raw) {
    return '—';
  }
  const trimmed = raw.trim();
  if (trimmed.length <= 12) {
    return trimmed;
  }
  return `${trimmed.slice(0, 6)}…${trimmed.slice(-4)}`;
};

const labelClass = 't-tiny font-semibold uppercase';
const labelStyle = {
  letterSpacing: '0.12em',
  color: 'var(--haze-3)',
} as const;
const helperClass = 't-tiny c-4';

export function Step1Basic({
  form,
  errors,
  setField,
  isUploadingGroupImage,
  onGroupImageChange,
  ownerAddress,
  ownerLabel,
}: Step1BasicProps) {
  const truncatedOwner = truncateAddress(ownerAddress);
  const visibilityLabel =
    form.groupVisibility === 'public' ? 'Public discovery' : 'Private invite-only';

  const previewRows: SidePreviewRow[] = [
    { label: 'Name', value: form.name.trim() || '—' },
    { label: 'Members', value: `${form.targetMembers || 0} people` },
    { label: 'Owner', value: truncatedOwner, mono: true },
    { label: 'Visibility', value: visibilityLabel },
  ];

  return (
    <div className="grid gap-5 md:grid-cols-[1.6fr_1fr]">
      <div style={cardStyle}>
        <div className="grid grid-cols-1 gap-x-5 gap-y-[18px] md:grid-cols-[1.6fr_1fr]">
          <div className="space-y-[6px]">
            <label htmlFor="step1-name" className={labelClass} style={labelStyle}>
              Group name
            </label>
            <input
              id="step1-name"
              className="input"
              value={form.name}
              onChange={event => setField('name', event.target.value)}
              placeholder="e.g. April 2026 Pool"
            />
            <p className={helperClass}>Visible to invited members. Short and memorable.</p>
            {errors.name ? <p className="t-tiny c-risk">{errors.name}</p> : null}
          </div>

          <div className="space-y-[6px]">
            <label htmlFor="step1-members" className={labelClass} style={labelStyle}>
              Target members
            </label>
            <input
              id="step1-members"
              type="number"
              min={3}
              max={255}
              className="input t-mono tabular-nums"
              value={form.targetMembers}
              onChange={event => setField('targetMembers', event.target.value)}
            />
            <p className={helperClass}>Includes you. Up to 255.</p>
            {errors.targetMembers ? (
              <p className="t-tiny c-risk">{errors.targetMembers}</p>
            ) : null}
          </div>

          <div className="space-y-[6px] md:col-span-2">
            <label htmlFor="step1-description" className={labelClass} style={labelStyle}>
              Description
            </label>
            <textarea
              id="step1-description"
              className="input"
              rows={3}
              value={form.description}
              onChange={event => setField('description', event.target.value)}
              placeholder="Purpose & expectations"
              style={{ height: 'auto', padding: '10px 12px', lineHeight: 1.55, resize: 'none' }}
            />
            <p className={helperClass}>1–3 sentences about the group goal.</p>
            {errors.description ? (
              <p className="t-tiny c-risk">{errors.description}</p>
            ) : null}
          </div>

          <div className="md:col-span-2" style={{ ...innerSurfaceStyle, padding: 16 }}>
            <p className="t-small c-2 font-semibold">Group image (optional)</p>
            <p className="t-tiny c-3 mt-1">
              Upload one image before signing. Images are auto-resized before upload.
            </p>
            <div className="mt-3 flex items-center gap-4">
              {form.groupImageUrl ? (
                <img
                  src={form.groupImageUrl}
                  alt="Group preview"
                  className="h-20 w-20 object-cover"
                  style={{ borderRadius: 'var(--r-md)', boxShadow: '0 0 0 1px var(--ink-5)' }}
                />
              ) : (
                <div
                  className="t-tiny c-3 flex h-20 w-20 items-center justify-center"
                  style={{
                    background: 'var(--ink-3)',
                    border: '1px solid var(--ink-5)',
                    borderRadius: 'var(--r-md)',
                  }}
                >
                  No image
                </div>
              )}
              <label className="btn btn-signal btn-sm cursor-pointer">
                {isUploadingGroupImage
                  ? 'Uploading…'
                  : form.groupImageUrl
                    ? 'Replace image'
                    : 'Upload image'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={isUploadingGroupImage}
                  onChange={event => {
                    void onGroupImageChange(event);
                  }}
                />
              </label>
            </div>
            {errors.groupImageUrl ? (
              <p className="t-tiny c-risk mt-2">{errors.groupImageUrl}</p>
            ) : null}
          </div>

          <div className="space-y-[6px]">
            <span className={labelClass} style={labelStyle}>
              Visibility
            </span>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={form.groupVisibility === 'public' ? 'secondary' : 'ghost'}
                onClick={() => setField('groupVisibility', 'public')}
              >
                Public
              </Button>
              <Button
                type="button"
                variant={form.groupVisibility === 'private' ? 'secondary' : 'ghost'}
                onClick={() => setField('groupVisibility', 'private')}
              >
                Private
              </Button>
            </div>
            <p className={helperClass}>
              Public groups appear in discovery. Private groups stay invite-only.
            </p>
            {errors.groupVisibility ? (
              <p className="t-tiny c-risk">{errors.groupVisibility}</p>
            ) : null}
          </div>

          <div className="space-y-[6px]">
            <span className={labelClass} style={labelStyle}>
              Owner
            </span>
            <div style={ownerCardStyle} className="flex items-center gap-[10px]">
              <span
                className="inline-flex h-7 w-7 items-center justify-center text-[11px] font-bold text-white"
                style={{ ...avatarStyle, borderRadius: '50%' }}
              >
                {ownerLabel}
              </span>
              <div className="min-w-0 flex-1">
                <p className="t-small c-1 truncate">Connected wallet</p>
                <p className="t-mono c-4 truncate" style={{ fontSize: 10 }}>
                  {truncatedOwner}
                </p>
              </div>
            </div>
            <p className={helperClass}>The wallet you signed in with. Cannot be changed here.</p>
          </div>
        </div>
      </div>

      <SidePreview
        title="Group preview"
        rows={previewRows}
        note="Invitees see this name and description on their invite card."
      />
    </div>
  );
}
