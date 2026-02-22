# Draft: [Brief description]

> **Status**: Draft  
> **Created**: YYYY-MM-DD  
> **Last Updated**: YYYY-MM-DD  
> **Author**: [name or "AI assistant"]

## Summary

[1-2 sentence summary of what this change would accomplish]

## Problem / Motivation

[Why is this change needed? What problem does it solve?]

## Proposed Solution

[High-level description of the approach]

## Analysis

[Research findings, technical investigation, tradeoffs considered]

## Scope

- **In scope**: [What this change covers]
- **Out of scope**: [What this change does NOT cover]

## Open Questions

- [ ] [Question that needs resolution before implementation]
- [ ] [Another question]

## Affected Capabilities

[List of existing specs/capabilities that would be affected, if known]

## Risks / Tradeoffs

| Consideration | Notes |
|---------------|-------|
| [Risk 1] | [Mitigation or acceptance] |

## Notes

[Any additional context, links to related discussions, etc.]

---

## Promotion Checklist

When ready to promote this draft to a full proposal:

- [ ] All open questions resolved
- [ ] Run `bee openspec list --specs` to check for spec changes since draft creation
- [ ] Review `openspec/changes/` for any overlapping in-progress work
- [ ] Create proposal directory: `openspec/changes/<sequence>-<change-id>/`
- [ ] Split into: `proposal.md`, `tasks.md`, optional `design.md`
- [ ] Create spec deltas under `specs/<capability>/spec.md`
- [ ] Validate: `bee openspec validate <change-id> --strict`
- [ ] Delete this draft file after successful promotion
