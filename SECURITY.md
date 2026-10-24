# Security policy

## Reporting a problem

Please report suspected vulnerabilities privately through the repository's
**Security → Report a vulnerability** form (GitHub private advisories) rather than a public
issue. Include steps to reproduce and the affected file or endpoint. This is a small project, so
there is no formal SLA, but reports are read and acted on promptly.

## What the application stores

Nothing. There are no accounts, no database and no cookies. A planning request is processed in
memory and answered; it is never written to disk or to logs. The only outbound call is to the
Gemini API (optional, server-side, and only when `GEMINI_API_KEY` is set).

## Design summary

The full threat model and the control-by-control mapping to the OWASP Top 10 and the OWASP Top 10
for LLM Applications are in the [README](README.md#security).

Short version:

- All input is validated by one strict schema, on the client for feedback and on the server as the
  actual gate. Unknown fields are rejected.
- Free text is normalised and stripped of delimiters and invisible characters before it goes near
  a model prompt, and model output is schema-validated and sanitised again before it reaches a page.
- Money and dates are computed by deterministic code. The model can only suggest ideas and cannot
  change any number a person acts on.
- Pages are served with a per-request, nonce-based Content-Security-Policy (no `unsafe-inline`
  scripts in production); the API sends `default-src 'none'`.
- The API key is read from the server environment only and never reaches the browser or the logs.
