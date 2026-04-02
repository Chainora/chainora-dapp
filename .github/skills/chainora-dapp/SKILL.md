---
name: chainora-dapp
description: "Implement and refactor chainora-dapp features with high exactness and prompt-to-code traceability. Use for route updates, wagmi/viem integration edits, state/query flow changes, and UI behavior fixes."
argument-hint: "Task goal, non-negotiable constraints, target files, and acceptance criteria"
user-invocable: true
---

# Chainora Dapp Exactness Skill

Use this skill for precise, low-regression changes in `chainora-dapp`.

## When To Use
- Route/page flow changes.
- Wallet/web3 integration edits.
- Query/state behavior adjustments.
- UI changes needing strict requirement mapping.

## Procedure
1. Create a requirement contract using `./assets/prompt-contract-template.md`.
2. Identify invariants (routes, provider setup, query keys, network configs).
3. Apply focused minimal edits only.
4. Run validation from `./assets/verification-checklist.md`.
5. Report requirement coverage explicitly.

## Guardrails
- Keep route registration and generated route tree behavior consistent.
- Preserve wallet connection flow unless explicitly requested.
- Avoid breaking query cache keys and provider boundaries.
- Keep public config surface backward compatible when possible.

## Output Requirements
- Requirement Coverage
- Validation Results
- Follow-up Risks (if any)
