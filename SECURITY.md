# Security Policy

Rigui stores schedules, goals, tasks and provider settings locally. Calendar data and API keys should be treated as sensitive personal information.

## Supported versions

Security fixes target the current `main` branch and the newest published build.

## Security boundaries

- Application data is stored in IndexedDB in the active browser or Electron profile.
- Online AI requests are sent only to the provider configured by the user; that provider's privacy and retention policy applies.
- JSON and ICS exports may contain private schedule details. Do not commit or upload real exports to public repositories.
- Browser extensions, compromised devices and unsigned third-party builds are outside the application's trust boundary.

## Reporting a vulnerability

Do not publish API keys, calendar contents, personal identifiers or exploit details in a public Issue. Open a minimal Issue requesting a private security-reporting channel and include no sensitive data. The maintainer will arrange a private follow-up.

## Operational guidance

- Use a restricted provider key rather than an account-wide credential where possible.
- Keep local backups before schema or desktop-app upgrades.
- Download desktop builds only from repository Releases or build them from the reviewed source.
