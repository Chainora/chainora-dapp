import type { Ref } from 'react';

import { Glyph } from '../../../components/group-detail/Glyph';

type SessionInfoCardProps = {
  actionPanelRef: Ref<HTMLElement>;
  currentCycle: string;
  currentPeriod: string;
  periodStatusLabel: string;
  periodDurationLabel: string;
  auctionWindowLabel: string;
  contributionWindowLabel: string;
  minReputation: string;
  claimableYieldLabel: string;
};

export function SessionInfoCard({
  actionPanelRef,
  currentCycle,
  currentPeriod,
  periodStatusLabel,
  periodDurationLabel,
  auctionWindowLabel,
  contributionWindowLabel,
  minReputation,
  claimableYieldLabel,
}: SessionInfoCardProps) {
  return (
    <article
      id="group-actions"
      ref={actionPanelRef}
      className="rounded-2xl border border-slate-200 bg-white p-5"
    >
      <h2 className="inline-flex items-center gap-2 text-lg font-bold text-slate-900">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
          <Glyph name="timeline" className="h-4 w-4" />
        </span>
        Session info
      </h2>
      <div className="mt-3 space-y-2 text-sm text-slate-600">
        <p className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
          <span className="text-slate-500">Cycle / period</span>
          <span className="font-semibold text-slate-800">{currentCycle} / {currentPeriod}</span>
        </p>
        <p className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
          <span className="text-slate-500">Period status</span>
          <span className="font-semibold text-slate-800">{periodStatusLabel}</span>
        </p>
        <p className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
          <span className="text-slate-500">Period duration</span>
          <span className="font-semibold text-slate-800">{periodDurationLabel}</span>
        </p>
        <p className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
          <span className="text-slate-500">Auction window</span>
          <span className="font-semibold text-slate-800">{auctionWindowLabel}</span>
        </p>
        <p className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
          <span className="text-slate-500">Contribution window</span>
          <span className="font-semibold text-slate-800">{contributionWindowLabel}</span>
        </p>
        <p className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
          <span className="text-slate-500">Min reputation</span>
          <span className="font-semibold text-slate-800">{minReputation}</span>
        </p>
        <p className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
          <span className="text-slate-500">Your claimable yield</span>
          <span className="font-semibold text-slate-800">{claimableYieldLabel}</span>
        </p>
      </div>
    </article>
  );
}
