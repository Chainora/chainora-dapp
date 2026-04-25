# Pages Agent Guide

## Scope
Page-level UI screens and composition.

## Design System
All pages now follow the Chainora Design System (dark-first Ink/Haze/Signal/Arc palette + Unbounded/Geist/Geist Mono typography). Tokens come from `src/styles/tokens.css` (synced from `chainora-design/chainora-design-system/project/tokens.css`). Use class utilities from tokens.css (`btn`, `chip`, `card`, `card-raised`, `pill`, `tick`, `link-connector`, `aurora`, `grid-lines`, `t-display`, `t-h1..h4`, `t-body`, `t-small`, `t-tiny`, `t-label`, `t-mono`, `t-num`, `c-1..c-3`, `bar`, `skeleton`) instead of hardcoded Tailwind palette colors.

## ROSCA Lifecycle Pill Chain
The visual lifecycle in `PoolTimeline` renders 5 stages: Contribute -> Lock -> Auction -> Award -> Settle. Forming is excluded (it only happens once at group inception and shows a notice instead).

## Prompt Update Rule
After prompts affecting this folder, update this file with changed pages and route impacts.

## Verify
- yarn -s tsc --noEmit
- yarn build
