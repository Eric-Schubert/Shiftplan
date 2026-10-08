# Shiftplan

[![CI](https://github.com/Eric-Schubert/Shiftplan/actions/workflows/ci.yml/badge.svg)](https://github.com/Eric-Schubert/Shiftplan/actions/workflows/ci.yml)
![Nuxt](https://img.shields.io/badge/Nuxt-4.x-00DC82?logo=nuxt.js)
![Vue](https://img.shields.io/badge/Vue-3.x-4FC08D?logo=vue.js)
![TypeScript](https://img.shields.io/badge/TypeScript-6.x-3178C6?logo=typescript)
![SQLite](https://img.shields.io/badge/SQLite-3.x-003B57?logo=sqlite)
![License](https://img.shields.io/badge/License-FSL--1.1--MIT-blue)

A browser-based shift planner for small and mid-sized teams. The app works week by week, supports fixed rotation patterns, and lets planners maintain schedules directly in the browser.

## Features

- Weekly planning with calendar weeks, public holidays, and school holidays
- Rotation patterns with a start week, cycle length, and template weeks
- Excel template export and import for rotation planning
- Staff, shift, and rotation management
- Planner role for shift assignments without full admin access
- Admin area for users, master data, and settings
- Audit log for manual schedule changes
- Optional team access code with QR code, so employees can read the plan without an account
- Push notifications for short-notice changes and team messages (installable web app, no app store)
- Personal app access per employee via QR code, day-level absences reported from the app with a team push
- Automated releases, changelog generation, and Docker image publishing via GitHub Actions

## Quick Start

Run the published image with Docker Compose:

```bash
docker compose up -d
```

For a production setup with HTTPS, the Shiftplan app, push notifications, updates, and backups, follow the [self-hosting guide](docs/self-hosting.md) (German).

To work on the code, see [Development](docs/development.md).

## Documentation

| Page | Content |
|------|---------|
| [Self-hosting](docs/self-hosting.md) | Installation, reverse proxy, app, push, updates, backups (German) |
| [Configuration](docs/configuration.md) | Backend config file, environment variables, contact email, demo instance |
| [Features](docs/features.md) | Roles, team access, push notifications, app access, absences, Excel rotation |
| [Development](docs/development.md) | Local setup, commands, project layout |
| [API](docs/api.md) | All endpoints with access level and CSRF requirement |
| [Releases](docs/releases.md) | Conventional Commits, release flow, Docker images |

## License

Functional Source License 1.1 with MIT future license (FSL-1.1-MIT). See [LICENSE](LICENSE).

- Self-hosting for your own organization, internal use, education, and research are allowed.
- Offering Shiftplan to others as a competing commercial product or hosted service is not allowed.
- Each version automatically becomes available under the MIT license two years after its release.
- Releases published before this change remain under the MIT license.
