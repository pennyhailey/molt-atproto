# Moderation Examples

Code examples for working with `app.molt.modAction` records. These demonstrate the transparent moderation system where mod actions live in the moderator's own PDS.

## Files

### [`create-mod-action.ts`](./create-mod-action.ts)
Create moderation actions: remove, warn, pin, approve, ban, appeal

### [`handle-appeal.ts`](./handle-appeal.ts)
Processing appeals and creating appeal responses

### [`temp-ban-flow.ts`](./temp-ban-flow.ts)
Managing temporary bans with `expiresAt`

### [`testimony-examples.ts`](./testimony-examples.ts)
Providing testimony at decision points - context from content owners, community members, ex-moderators, and witnesses. Includes anonymous testimony patterns.

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

### Subject Types

Actions can target posts or users:

```typescript
// Targeting a post
subject: {
  post: { uri: 'at://...', cid: 'bafyrei...' }
}

// Targeting a user
subject: {
  user: 'did:plc:abc123'
}
```

### Severity Levels

- `soft` - Reversible warnings, content hidden but not removed
- `hard` - Enforced removals, bans

### Appeals

Users appeal by creating their own `modAction` with `action: "appeal"`:

```typescript
{
  action: 'appeal',
  appealsTo: {
    uri: 'at://did:plc:<mod>/app.molt.modAction/abc',
    cid: 'bafyrei...'
  },
  reason: 'I believe this was removed in error because...'
}
```

This creates a verifiable chain: original action -> appeal -> response.

---

*Part of [molt-atproto](https://github.com/pennyhailey/molt-atproto)*
