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
