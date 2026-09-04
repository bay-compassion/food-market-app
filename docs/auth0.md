# Auth0 configuration sync

The reviewed Auth0 tenant configuration lives in `infrastructure/auth0/tenant/`. Auth0's official
[Deploy CLI](https://auth0.com/docs/deploy-monitor/deploy-cli-tool) is pinned as a development
dependency. The npm commands call `infrastructure/auth0/auth0.mts`, which uses the Deploy CLI's
[Node module API](https://auth0.com/docs/deploy-monitor/deploy-cli-tool/use-as-a-node-module).
This workflow is manual; app builds and Netlify deploys do not change Auth0 resources.

## Credentials

The Deploy CLI needs a dedicated Machine to Machine application authorized for the Auth0
Management API. Use `infrastructure/auth0/.env.source` for the tenant read by exports and
`infrastructure/auth0/.env.target` for the tenant read or written by plans and imports:

```bash
cp infrastructure/auth0/.env.example infrastructure/auth0/.env.source
cp infrastructure/auth0/.env.example infrastructure/auth0/.env.target
```

Fill in `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, and `AUTH0_CLIENT_SECRET`. These ignored files contain
Management API credentials and are separate from the app's public `VITE_AUTH0_*` settings. The
source application needs read scopes. The target application needs read/create/update scopes for
the managed resources. Neither needs delete scopes, and `AUTH0_ALLOW_DELETE` remains false.

Shell environment variables take precedence over values loaded from these files. Clear stale
`AUTH0_*` variables before running a command. Do not set the app API identifier as
`AUTH0_AUDIENCE`; the Deploy CLI reserves that variable for the Management API audience.

## Pull dashboard changes into the repository

```bash
npm run auth0:export
```

The command reads the source tenant and writes `infrastructure/auth0/export/tenant.yaml`. The
export directory is ignored because it is an unreviewed staging area. Exported configuration can
contain sensitive connection settings, URLs, scripts, and templates; some secrets appear as
placeholders or cannot be exported. Review the complete output and its companion files before
copying changes into `infrastructure/auth0/tenant/`. Preserve relative paths for companion files
and inspect the Git diff for secrets.

The CLI omits resource identifiers by default for portability and excludes the M2M application
used to run it. Review changes to application callback/logout/web-origin URLs, API audience and
RS256 settings, client grants, RBAC and access-token permissions, connections, and the roles in
[`roles.md`](roles.md). An omitted resource is skipped by import; an empty collection can request
deletion if deletion is ever enabled.

## Preview and push reviewed changes

```bash
npm run auth0:plan
npm run auth0:import
```

Both commands use only `infrastructure/auth0/tenant/tenant.yaml`, never the unreviewed export.
`auth0:plan` uses the Deploy CLI's dry-run preview and forcibly disables automatic and interactive
apply. It reads the target tenant and shows proposed changes without writing them. Review that
output before running `auth0:import`, which creates or updates resources in the target tenant.
Imports do not sync users, passwords, sessions, MFA enrollments, or role assignments.

## Managed scope

`infrastructure/auth0/config.json` allowlists applications, client grants, APIs, connections,
database connections, roles, and basic tenant settings. This applies in both directions. It can
include unrelated resources when they share the same Auth0 tenant, so keep only intended resources
in the reviewed configuration.

The config also excludes the Deploy CLI application by name and strips resource IDs, client IDs,
client secrets, signing keys, and creation/update timestamps during both export and import. These
guards keep machine-specific identifiers and credentials from returning on a later sync. The Node
script passes the config programmatically so shell variables cannot override its deletion,
identifier-export, secret-export, or field-exclusion safeguards.

Branding, Universal Login templates, custom domains, log streams, organizations, Actions, MFA,
and other optional features are outside this scope. Branding is omitted because the source
tenant's Universal Login template endpoint returned HTTP 402 for a paid feature and caused the
whole export to fail. If the app begins using an excluded resource, extend `AUTH0_INCLUDED_ONLY`
deliberately and grant the corresponding Management API scopes. Do not combine it with
`AUTH0_EXCLUDED`.

Run `npm run auth0:export -- --help` to see command help. If an export fails because of a missing
scope, grant the indicated read scope and rerun; do not treat a failed or partial export as the
current tenant configuration.
