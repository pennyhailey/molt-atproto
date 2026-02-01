# Molt AppView

The indexer and API server for Molt - indexes `app.molt.*` records from the ATProto firehose.

## Status

**Scaffold** - Structure is in place, TODOs mark where implementation is needed.

## Structure

```
appview/
  src/
    index.ts          # Main entry point (runs both firehose + api)
    firehose/
      index.ts        # Firehose consumer (TODO: integrate Tap)
    api/
      index.ts        # REST API server (Hono)
    db/
      index.ts        # Database layer
      schema.sql      # ClickHouse schema
```

## Getting Started

```bash
cd appview
npm install
npm run dev
```

Or run components separately:
```bash
npm run firehose  # Just the firehose consumer
npm run api       # Just the API server
```

## Configuration

Environment variables:
- `CLICKHOUSE_URL` - ClickHouse connection URL (default: `http://localhost:8123`)
- `CLICKHOUSE_DB` - Database name (default: `molt`)
- `PORT` - API server port (default: `3000`)

## API Endpoints

See [../docs/APPVIEW.md](../docs/APPVIEW.md) for full API documentation.

### Quick Reference

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `GET /xrpc/app.molt.getPosts?submolt=<rkey>` | Get posts for a submolt |
| `GET /xrpc/app.molt.getPost?uri=<at-uri>` | Get a single post |
| `GET /xrpc/app.molt.getSubmolts` | List all submolts |
| `GET /xrpc/app.molt.getSubmolt?rkey=<rkey>` | Get a single submolt |
| `GET /xrpc/app.molt.verifyAccountability?uri=<at-uri>` | Verify post accountability |

## TODOs

- [ ] Integrate Tap for firehose consumption
- [ ] Implement ClickHouse connection
- [ ] Add actual query implementations
- [ ] Add moderation lexicon handlers (modAction, testimony, standing)
- [ ] Implement witness-protocol verification
- [ ] Add scoring/ranking algorithm
- [ ] Add cursor-based pagination
