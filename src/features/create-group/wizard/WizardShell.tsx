import type { ReactNode } from 'react';

import { Button } from '../../../components/ui/Button';
import { Stepper } from './Stepper';

type WizardNavAction = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

type WizardShellProps = {
  activeStep: 0 | 1 | 2 | 3;
  title: ReactNode;
  intro: string;
  onCancel: () => void;
  back?: WizardNavAction;
  next?: WizardNavAction;
  helperText?: string;
  children: ReactNode;
};

export function WizardShell({
  activeStep,
  title,
  intro,
  onCancel,
  back,
  next,
  helperText,
  children,
}: WizardShellProps) {
  return (
    <section className="mx-auto w-full max-w-[1280px] px-6 py-8">
      <div className="mb-[22px] flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-[6px]">
          <p className="t-label c-signal">
            C · Create group · step {activeStep + 1} / 4
          </p>
          <h1 className="t-display">{title}</h1>
          <p className="t-small c-3" style={{ maxWidth: '64ch' }}>
            {intro}
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      <Stepper active={activeStep} />

      <div className="mt-5">{children}</div>

      <div
        className="mt-6 flex flex-wrap items-center justify-between gap-4"
        style={{ paddingTop: 18, borderTop: '1px solid var(--ink-5)' }}
      >
        {back ? (
          <Button type="button" variant="ghost" onClick={back.onClick} disabled={back.disabled}>
            ← {back.label}
          </Button>
        ) : (
          <span />
        )}
        {helperText ? <p className="t-tiny c-3">{helperText}</p> : <span />}
        {next ? (
          <Button
            type="button"
            variant="secondary"
            onClick={next.onClick}
            disabled={next.disabled}
          >
            {next.label} →
          </Button>
        ) : (
          <span />
        )}
      </div>
    </section>
  );
}
