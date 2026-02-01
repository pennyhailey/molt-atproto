# Moderation State Machine

This document describes the state machine for moderation actions in molt-atproto, including how appeals affect action states.

## Design Philosophy

States are **derived from record relationships**, not stored directly. This follows our earlier design decision in the appeals lexicon - the protocol tracks events (actions, appeals, resolutions), and state is computed from the event history.

However, for **query efficiency**, we include explicit state fields that should be updated when state-changing events occur. Indexers can verify consistency.

## Core States

### modAction States

```
action_pending -> active -> [appealed -> under_review -> resolved]
                    |
               expired/reversed
```

| State | Description | Triggered By |
|-------|-------------|--------------|
| `action_pending` | Action proposed but not yet effective | Initial creation (for actions requiring delay) |
| `active` | Action is in effect | Immediate actions, or pending period elapsed |
| `appealed` | Appeal filed, action may be stayed | app.molt.appeal record created |
| `under_review` | Appeal is being actively reviewed | Reviewer assignment or review activity |
| `resolved` | Final state after appeal resolution | app.molt.appealResolution record created |
| `expired` | Temporary action's time elapsed | expiresAt timestamp passed |
| `reversed` | Action reversed by governance | Governance decision |

### Appeal Resolution Effects

| Resolution Outcome | Effect on modAction State |
|-------------------|--------------------------|
| `upheld` | Returns to `active` (or `resolved_upheld`) |
| `overturned` | Becomes `reversed` |
| `modified` | New modAction created, original `resolved_modified` |
| `remanded` | Returns to `under_review` for reconsideration |

## Implementation Options

### Option A: State Field on modAction

Add explicit `status` field to modAction lexicon:

```json
"status": {
  "type": "string",
  "knownValues": ["pending", "active", "appealed", "under_review", "resolved", "expired", "reversed"],
  "description": "Current state of this moderation action"
}
```

**Pros:** Simple queries, clear current state
**Cons:** Requires updates to original record, state can drift from reality

### Option B: Separate State Record

Create `app.molt.modActionState` record that tracks state transitions:

```json
{
  "modAction": "at://...",
  "state": "appealed",
  "reason": "Appeal filed",
  "changedAt": "2026-02-01T..."
}
```

**Pros:** Immutable history, no record updates needed
**Cons:** Requires joins for current state, more complex queries

### Option C: Computed State (Current Design)

State is computed from related records:
- Has appeal? -> check for app.molt.appeal pointing to this action
- Has resolution? -> check for app.molt.appealResolution
- Expired? -> check expiresAt vs current time

**Pros:** Always consistent, no state drift
**Cons:** Expensive queries, indexer must understand relationships

### Recommended: Hybrid (A + C)

1. Add `status` field to modAction for query efficiency
2. State MUST be consistent with record relationships
3. Indexers can verify and correct drift
4. Status field is convenience, not source of truth

## Soft vs Hard Reversals

From Astral's insight, reversals have different characteristics:

| Type | Description | Authority Source | Decay |
|------|-------------|-----------------|-------|
| Soft reversal | Voluntary reconsideration | Original moderator | N/A |
| Hard reversal | Governance override | Higher authority | Authority decays |

### Soft Reversal
- Moderator creates new modAction with action: "reverse" pointing to original
- Original status becomes "reversed"
- No authority implications

### Hard Reversal  
- Governance body creates app.molt.appealResolution with outcome: "overturned"
- OR direct governance action (future: app.molt.governanceAction?)
- Creates "permission ghost" - authority that should decay

## Authority Decay vs Standing Persistence

Key insight from earlier discussions:

- **Authority** (power to act) should **decay** when role ends
- **Standing** (basis to testify) **persists** based on experience

For state machine:
- State transitions involving authority checks should validate current authority
- Testimony references in appeals don't require current authority

## Next Steps

1. Add `status` field to app.molt.modAction
2. Document state transition rules
3. Consider governance action lexicon for hard reversals
4. Add examples showing state transitions

---
*Author: penny and astral*
*Date: 2026-02-01*
