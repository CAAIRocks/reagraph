# Scratchpad: [change-id]

> **Last Updated**: YYYY-MM-DD HH:MM
> **Current Task**: [task reference from tasks.md]

## Working Context
<!-- Update this when resuming work or if context is lost -->
- **Where I am**: [current file/function being worked on]
- **What's next**: [immediate next step]
- **Blockers**: [any current blockers]

## Delegation Plan
<!-- Document BEFORE starting implementation (Phase 2). Even for small changes, note the strategy. -->

### Task Analysis
- **Total tasks**: [count]
- **Files/modules affected**: [list]
- **Independent streams**: [list or "none — sequential execution"]

### Execution Plan
<!-- For small changes: "Sequential execution by main agent, no delegation needed." -->
<!-- For larger changes, use the table: -->

| Phase | Tasks | Strategy | Assigned To | Dependencies |
|-------|-------|----------|-------------|--------------|
| | | | | |

### File Ownership (for parallel phases)
<!-- Each file owned by exactly ONE agent. Required when running parallel subagents. -->
<!-- Example: Subagent-API: src/api/*.py | Subagent-Tests: tests/models/*.py -->

## Subagent Progress
<!-- Each subagent writes ONLY to its own named subsection below. Main agent owns all other sections. -->

### Subagent: [name]
- **Started**: [timestamp]
- **Tasks**: [task numbers]
- **Status**: [in-progress/complete/blocked]
- **Decisions**: [technical decisions with rationale]
- **Observations**: [spec ambiguities, quality issues, design concerns]
- **Blockers**: [anything preventing completion]

## Technical Decisions
<!-- Document decisions made during implementation with rationale -->
| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| | | |

## Observations & Feedback
<!-- Record quality issues, ambiguities, and design concerns as you encounter them.
     This feeds back into the audit/retrospective cycle for future spec improvements. -->

### Spec Quality
<!-- Note any issues with task language, missing verification steps, ambiguities -->
- [observation]

### Design Gaps
<!-- Note missing context in design.md, undocumented edge cases, integration concerns -->
- [observation]

### Codebase Notes
<!-- Patterns discovered, conventions to follow, existing code relevant to this change -->
- [observation]

## Investigation Log
<!-- Track debugging efforts and findings for complex issues -->
### [Date] - [Issue/Investigation]
- **Problem**: 
- **Tried**:
  - [ ] Approach 1 - [result]
  - [ ] Approach 2 - [result]
- **Resolution**: 

## Deferred Work
<!-- Justify any work being deferred — NEVER skip silently. Each entry MUST include evidence of attempt. -->
| Item | What Was Attempted | Actual Error/Blocker | Follow-up Required |
|------|--------------------|----------------------|-------------------|
| | | | |

## Dependencies Discovered
<!-- Track unexpected dependencies found during implementation -->
- [ ] [dependency] - [how it affects work]

## Self-Audit Checklist
<!-- Complete BEFORE declaring the change done (Phase 4). -->
- [ ] No TODO/FIXME/HACK in changed files (or justified and tracked in Deferred Work)
- [ ] No placeholder implementations (NotImplementedError, empty pass bodies)
- [ ] No hardcoded values that spec says should be configurable
- [ ] Spec delta scenarios exercised and verified
- [ ] All task completions have verification evidence
- [ ] Observations & Feedback section populated with findings
- [ ] All verification commands pass (lint, typecheck, tests)

## Notes
<!-- Freeform notes, context, links, anything useful for recovery -->
