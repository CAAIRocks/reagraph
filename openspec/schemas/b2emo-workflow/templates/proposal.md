# Change: <!-- title -->

## Why

<!-- Explain the motivation for this change. What problem does this solve? Why now? -->

## What Changes

<!-- Describe what will change. Be specific about new capabilities, modifications, or removals. -->

## Dependencies

<!-- List prerequisite change-ids that must be completed first. Example: `110-opsx-foundation`. State "None" if no dependencies. -->

## Replaces

<!-- If this change supersedes an existing change, list it here with explanation. Omit this section if nothing is replaced. -->

## Capabilities

### New Capabilities
<!-- Capabilities being introduced. Replace <name> with kebab-case identifier (e.g., user-auth, data-export, api-rate-limiting). Each creates specs/<name>/spec.md -->
- `<name>`: <brief description of what this capability covers>

### Modified Capabilities
<!-- Existing capabilities whose REQUIREMENTS are changing (not just implementation).
     Only list here if spec-level behavior changes. Each needs a delta spec file.
     Use existing spec names from openspec/specs/. Leave empty if no requirement changes. -->
- `<existing-name>`: <what requirement is changing>

## Impact

<!-- Affected code, APIs, dependencies, systems -->

## Reuse Inventory

### Existing Code
<!-- Search the codebase for modules, classes, functions, and utilities that overlap with
     or are directly usable by this change. Use rg/grep to find relevant code.
     For each item: file path, function/class name, and how it should be used. -->
- `path/to/module.py:function_name()` -- <how this will be used or extended>

### From Dependency Specs
<!-- For each change-id listed in ## Dependencies above, reference the specific interfaces,
     contracts, or components this change will consume. Cite the spec artifact where the
     contract is defined (proposal.md, design.md, or spec delta). -->
- **<change-id>**: <component/interface name> per `openspec/changes/<id>/specs/<cap>/spec.md`
  - Expected interface: <method signatures, data shapes, or behavioral contract>
  - Relevant scenario: <which scenario in the spec defines the contract>

### Net-New Components
<!-- List ONLY components that are genuinely new -- not available in codebase or dependency specs.
     If this section is large relative to the sections above, reconsider whether you missed
     existing code. -->
- <component> -- <why it must be built from scratch>

## Backwards Compatibility

<!-- Default: None required — this is internal code with no external consumers of these import paths.
     Change this ONLY if systems outside this repository import the paths being moved/changed.
     If external consumers exist, list them here and specify the transition end date.
     Leaving this as "None required" means agents will update all callers in-place and delete old locations without creating re-export stubs. -->
None required.
