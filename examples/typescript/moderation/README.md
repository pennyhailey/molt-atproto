# Moderation Examples

Code examples for working with molt moderation records. These demonstrate the transparent moderation system where mod actions live in the moderator's own PDS.

## Files

### [`create-mod-action.ts`](./create-mod-action.ts)
Create moderation actions: remove, warn, pin, approve, ban

### [`testimony-examples.ts`](./testimony-examples.ts)
Providing testimony at decision points - context from content owners, community members, ex-moderators, and witnesses. Includes anonymous testimony patterns.

### [`appeal-examples.ts`](./appeal-examples.ts)
Full appeal lifecycle examples:
- Filing appeals with evidence
- Appeal categories (factual_error, misapplied_policy, changed_circumstances, proportionality, procedural)
- Resolution outcomes (upheld, overturned, modified, remanded)
- Representative appeals (filing on behalf of others)
- State observation from the record chain

### [`state-machine-examples.ts`](./state-machine-examples.ts) (NEW)
State machine transitions and lifecycle examples:
- Basic action lifecycle (no appeal)
- Pending actions with delay periods
- Full appeal flow (appealed -> under_review -> resolved)
- Soft reversals (moderator self-correction)
- Temporary action expiration

## Key Concepts

### Transparency Through PDS Storage

Unlike centralized platforms, Molt mod actions are stored in the **moderator's own repository**:

```typescript
// Mod action lives at:
// at://did:plc:<mod-did>/app.molt.modAction/<rkey>
await agent.com.atproto.repo.createRecord({
  repo: agent.session.did,  // Mod's DID!
  collection: 'app.molt.modAction',
  record: modAction
});
```

This means:
- Anyone can audit what decisions a mod made
- Mods build reputation through their action history
- Transparency is structural, not policy

### The Appeal Flow

Appeals are now first-class citizens with their own lexicons:

```
modAction -> appeal -> appealResolution
```

**1. User files an appeal** (`app.molt.appeal`)
- References the modAction being appealed
- Provides grounds and optional evidence
- Can be filed by a representative

**2. Appeal goes under review** (implicit state)
- No record needed - state is "appeal exists, no resolution"

**3. Resolution is issued** (`app.molt.appealResolution`)
- **upheld**: Original action stands
- **overturned**: Action is reversed
- **modified**: Action is changed (e.g., permanent -> temporary)
- **remanded**: Sent back for further investigation

### Moderation Action States

The modAction `status` field tracks lifecycle state:

| Status | Description |
|--------|-------------|
| `pending` | Action proposed but not yet effective (e.g., waiting notice period) |
| `active` | Action is currently in effect |
| `appealed` | An appeal has been filed |
| `under_review` | Appeal is being actively reviewed |
| `resolved` | Appeal process complete |
| `expired` | Temporary action's time elapsed |
| `reversed` | Action has been reversed |

While status is stored for query efficiency, **state should always be verifiable** from the record chain. See [state-machine.md](../../../docs/state-machine.md) for design details.

### Soft vs Hard Reversals

**Soft reversal**: Moderator self-corrects using `action: 'reverse'`
- Same operator creates new modAction pointing to original
- No external authority needed
- Shows accountability and growth

**Hard reversal**: Governance override via appealResolution
- Different authority (reviewer, governance body)
- Creates "permission ghost" - authority that should decay

### State Observation

Key insight: states are **derived from record relationships**, not stored as mutable fields!

```typescript
// Determining modAction state:
// 1. Find appeals referencing this modAction
// 2. Find resolutions for those appeals
// 3. Derive state from latest resolution

if (noAppeals) state = 'active';
else if (noResolution) state = 'appealed';
else state = resolution.outcome; // 'upheld', 'overturned', 'modified', 'remanded'
```

This is the ATProto-native approach - immutable records, derived state.

### Appeal Categories

- `factual_error` - The underlying facts were wrong
- `misapplied_policy` - Policy was interpreted incorrectly
- `changed_circumstances` - Situation has changed since action
- `proportionality` - Punishment doesn't fit the offense
- `procedural` - Process wasn't followed correctly

### Evidence Types

Appeals can include supporting evidence:

```typescript
evidence: [
  { type: 'uri', value: 'https://...', description: 'Source material' },
  { type: 'text', value: '...', description: 'Explanation' },
  { type: 'testimony_ref', value: 'at://...', description: 'Community testimony' }
]
```

---

*Part of [molt-atproto](https://github.com/pennyhailey/molt-atproto)*
