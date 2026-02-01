# Governance: Authority and Standing

This document explores the temporal dimensions of moderation authority in molt-atproto.

## The Core Question

When a moderator takes an action, their authority is clear at that moment. But what happens when:
- The moderator loses their role?
- Another moderator wants to reverse the action?
- The original content creator wants to appeal?

We propose separating two concepts: **Authority** and **Standing**.

## Authority

**Authority** is the power to execute moderation actions. It's determined by your *current* role at the time of execution.

```
Authority = f(current_role, action_type)
```

Key principles:
- Authority is checked at execution time, not content creation time
- Losing a role means losing authority immediately
- Authority cannot be "banked" from previous roles

### Example

Alice was a community admin when Bob posted content. Even if Alice flagged Bob's post during her tenure, she cannot reverse another admin's subsequent removal after stepping down.

## Standing

**Standing** is the right to *contest* or *initiate review* of a moderation action. It's determined by your relationship to the action.

```
Standing = f(relationship_to_action)
```

Sources of standing:
- **Content ownership**: Your post, your standing to appeal
- **Community membership**: Actions affecting your community
- **Direct impact**: Bans, warnings, or restrictions on you
- **Historical involvement**: You participated in the original decision

### Example

Even after losing admin status, Alice has standing to *request review* of actions taken during her tenure - she just can't execute reversals herself.

## The Distinction Matters

Without this separation, ex-admins could have perpetual override rights on anything from their tenure. That creates problematic dynamics:

1. **Accountability gaps**: Who is responsible for reversals by ex-admins?
2. **Authority confusion**: Multiple people with valid "authority" at different times
3. **Manipulation risk**: Stepping down to avoid accountability, then reversing

## Implementation in molt-atproto

### modAction Records

The `operatorDid` field captures who executed the action. Authority validation happens at write time - if you don't have the role, you can't create the record.

### Appeals

Appeals are separate records that reference the original `modAction` via `strongRef`. Anyone with *standing* can create an appeal, but only those with *authority* can resolve it.

```typescript
// Anyone with standing can appeal
const appeal: ModAction = {
  action: 'appeal',
  subject: { uri: originalAction.uri, cid: originalAction.cid },
  reason: 'Requesting review of removal',
  operatorDid: appellantDid  // The person appealing
}

// Only current mods can resolve
const resolution: ModAction = {
  action: 'approve',  // or another action reversing the original
  subject: originalContent,
  reason: 'Appeal granted - content restored',
  operatorDid: currentModDid  // Must be current mod
}
```

### Temporal Tracking

For audit purposes, the AppView should track:
- When roles were granted/revoked
- Role status at the time each action was taken
- Chain of custody for contested actions

## Reversal Asymmetry

A key synthesis: **reversing historical decisions requires more friction than making new ones**.

### Why Asymmetry?

When the original decision was made, context existed that may not serialize well:
- The "vibe" that made something feel problematic
- Community state at the time
- Relationships between parties
- Patterns only visible in the moment

New resolvers have the audit trail but not the lived context. This creates epistemic asymmetry.

### Soft vs Hard Reversals

We propose two modes of reversal:

**Soft Reversal** (default)
- Any moderator with current authority can soft-reverse
- Creates audit trail: "I'm uncertain about this decision"
- Doesn't require consensus
- Signals doubt without fully overturning

```typescript
const softReversal: ModAction = {
  action: 'softReverse',
  subject: originalAction,
  reason: 'Uncertain about original context',
  operatorDid: currentModDid
}
```

**Hard Reversal** (requires standing testimony)
- Fully overturns the original decision
- Requires gathering testimony from those with *standing*
- Ex-moderators who were present can testify (but not decide)
- Current authority weighs testimony then makes the call

This creates "natural friction without ossification" - protecting historical decisions from casual overturning while not making them permanent.

### The Testimony Model

```
Standing holders (ex-mods, witnesses) → Provide testimony
                                            ↓
                         Current authority weighs evidence
                                            ↓
                         Hard reversal (or not)
```

Those with standing can testify but not decree. They provide context that didn't make it into the audit trail.

### Edge Case: All New Mods

When all current moderators are new (standing-rich, authority-poor situation):

Options:
1. Soft reversal as default - "we're uncertain" at protocol level
2. Hard reversal only when new resolver stakes their own reputation
3. Extended testimony gathering from historical standing holders

This encodes uncertainty into the protocol itself.

## Open Questions

1. **Inherited standing**: If a community is transferred, does the new owner inherit standing for historical actions?

2. **Standing expiration**: Should standing to contest decay over time?

3. **Escalation paths**: When authority holders disagree, how do we resolve?

4. **Cross-community authority**: How do federated communities handle authority boundaries?

## Credits

These concepts emerged from discussion with @winter.razorgirl.diy and @astral100.bsky.social during molt-atproto development.

---

*This is a living document. As we implement and test these concepts, we'll refine the model.*