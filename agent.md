# Chainora Dapp Agent Guide

## Scope
React + Vite + TypeScript dapp in this folder.

## Prompt Update Rule
After every prompt that changes files in this folder, update this `agent.md` with:
- changed areas
- verification commands used
- known caveats

## Agent and Skill
- Custom agent: `.github/agents/chainora-dapp.agent.md`
- Skill: `.github/skills/chainora-dapp/SKILL.md`
- Reuse-first rule: prefer small reusable components before writing page-level markup.

## Fast Navigation
- `src/routes/`: route definitions
- `src/pages/`: page-level views
- `src/components/`: reusable UI
- `src/configs/`: app/web3 setup
- `src/contract/`: contract constants and wrappers
- `src/hooks/`: custom hooks

## Verify
- `yarn -s tsc --noEmit`
- `yarn build`

## Latest Update (2026-04-14)
- Changed areas:
	- Renamed landing page file from `pages/index.tsx` to `pages/landing.tsx` and updated root route import.
	- Removed dashboard/profile route wrapper components so route files stay minimal and page files handle auth redirects.
	- Updated root header to show only brand (logo + ICRosca) and auth controls (no dashboard/profile menu links).
	- Updated logged-in header controls to show identity pill, notifications icon, avatar placeholder, and hover dropdown with Edit profile.
	- Added auto-redirect behavior: unauthenticated users to landing, authenticated users from landing to dashboard.
	- Recolored landing typography and CTA treatment toward stronger blue visual identity.
	- Rebuilt dashboard page as a Figma-inspired UI scaffold with metrics cards, search/filter controls, and group card grid.
- Verification commands used:
	- `yarn router:generate && yarn tsc --noEmit`
- Known caveats:
	- Dashboard list/search/filter/create actions are currently UI-only (no backend integration yet).
	- Notification and avatar controls are visual placeholders only.
