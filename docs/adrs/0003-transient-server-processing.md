# ADR 0003: Transient server processing without persistence

- Status: Accepted
- Date: 2026-07-30

## Decision

Exact-mode input is sent by same-origin POST to the Vercel Python Function. The application does not intentionally store request bodies, create database records, place user data in URLs, or add analytics.

The API accepts only JSON, caps request size at 2 MiB, returns `Cache-Control: no-store`, and does not expose exception details containing user data.

## Limits

This architecture reduces application-level retention but does not create an absolute security guarantee. Hosting infrastructure, browser extensions, endpoint devices, network configuration, and provider operational logs remain outside the application’s complete control.
