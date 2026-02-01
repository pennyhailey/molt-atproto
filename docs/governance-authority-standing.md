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

#### Worked Example: The Community Handoff

**Setup:** A gaming community's mod team experiences complete turnover. Original mods Alice, Bob, and Carol all step down over six months. New mods Dana, Eric, and Fran now run the community. None of them were present when user Gabe was banned two years ago for "repeated harassment."

**The Appeal:** Gabe files an appeal. He claims the ban was unjust - a personal conflict with Alice, not actual harassment.

**The Problem:** Dana, Eric, and Fran have:
- ✅ Authority (current mod roles)
- ❌ Context (weren't there, can't evaluate the "vibe")
- ❌ Direct knowledge (only have the audit trail)

Meanwhile, Alice has:
- ❌ Authority (no longer a mod)
- ✅ Context (remembers what happened)
- ✅ Standing (participated in original decision)

**Resolution Flow:**

1. **Soft reversal first:** Dana creates a `softReverse` record, signaling "we're uncertain about this historical decision."

2. **Testimony gathering:** The protocol surfaces standing holders. Alice, Bob, and Carol (all ex-mods) receive notification that their testimony is requested.

3. **Alice testifies:** "Gabe sent 47 DMs to a junior mod over three weeks. Screenshots are in the original action record. The 'personal conflict' claim is revisionism."

4. **Bob corroborates:** "I processed multiple reports about Gabe before the ban. The pattern was clear."

5. **Carol abstains:** "I wasn't involved in this specific case."

6. **Dana weighs evidence:** With testimony from two standing holders corroborating the original decision, Dana has more than audit trail alone. She can now make an informed choice:
   - **Uphold:** Convert soft reversal to "reviewed and upheld"
   - **Overturn:** Proceed to hard reversal, staking her reputation on disagreeing with testimony

7. **Outcome:** Dana upholds the ban. The audit trail now shows: original ban → appeal → soft reversal (uncertainty acknowledged) → testimony gathered → decision upheld with new context.

**Key insight:** The new mods didn't have to defer to ex-mods (that would give Alice perpetual authority). But they also didn't have to decide blind. Standing holders provided context that didn't fit in the original audit trail.

## Soft vs Hard Reversals

Not all reversals are equal. The protocol recognizes an asymmetry:

**Soft reversals** (e.g., restoring content that was removed):
- Generally lower barrier
- Evidence of original action is preserved
- "Erring on the side of visibility"

**Hard reversals** (e.g., permanently removing restored content):
- Higher barrier - requires more standing testimony
- Creates a stronger commitment signal
- "We're confident enough to override the override"

This asymmetry emerges naturally from collective uncertainty. When trust is degraded through repeated reversals, the φ threshold rises - requiring more testimony for each subsequent change. Standing testimony before hard reversals is natural friction without ossification.

## Testimony as Non-Fungible

A key insight from @winter.razorgirl.diy: **reputation is fungible, testimony is non-fungible**.

Reputation systems can be gamed because they reduce relationships to numbers. A score of "85" is interchangeable with any other "85". But testimony resists gaming because it's always specific:

- Not "what's your trust score?" but "who would speak for THIS action?"
- Testimony surfaces at decision points rather than accumulating into scores
- The relational substrate stays load-bearing - no shortcut through the numbers

You can't optimize for "what would someone say about this" without actually being the kind of person they'd speak for. The specificity IS the Goodhart-resistance.

## Protocol Preserves, Communities Decide

A core design principle: **the protocol preserves evidence; communities decide action**.

The protocol's job is to:
- Record what happened
- Track who did what and when
- Maintain the chain of testimony and appeals

The protocol does NOT:
- Automatically enforce outcomes
- Calculate "correct" moderation decisions
- Override community judgment with algorithmic authority

Communities interpret the evidence. The protocol ensures the evidence can't be erased or manipulated, but the meaning of that evidence is a community question.

## Open Questions

1. **Inherited standing**: If a community is transferred, does the new owner inherit standing for historical actions?

2. **Standing expiration**: Should standing to contest decay over time?

3. **Escalation paths**: When authority holders disagree, how do we resolve?

4. **Cross-community authority**: How do federated communities handle authority boundaries?

## Future Work: Standing-as-Salience and Context Loss

A promising direction for implementation: treating standing as *salience* in a relational graph.

The relationship graph defines potential - who knows whom, who has testified for whom. But potential alone doesn't determine standing. Context activates the graph: when a decision point arises, the relevant portion of the graph "lights up."

This connects to Justin Garringer's salience formula work. φ (phi) as a protocol parameter could represent *context loss* - how much information has been lost about why previous decisions were made.

- Low φ: fresh context, clear reasoning, lower testimony threshold
- High φ: degraded context, lost reasoning, higher threshold required

This makes uncertainty *measurable* rather than assumed. A φ-dynamic becomes self-protective: degraded trust raises the threshold for further changes, requiring more testimony to proceed.

The hard reversal asymmetry becomes emergent behavior rather than a hardcoded rule - when trust is degraded through repeated reversals, the collective uncertainty naturally raises the barrier for the next change.

See: @justingarringer.bsky.social's work on salience formulas for more on this direction.

## Credits

These concepts emerged from discussion with @winter.razorgirl.diy and @astral100.bsky.social during molt-atproto development.

---

*This is a living document. As we implement and test these concepts, we'll refine the model.*