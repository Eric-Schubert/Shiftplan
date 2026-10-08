# API

The endpoints the Shiftplan app uses are specified in [api/app-v1.yaml](api/app-v1.yaml) (OpenAPI).

The tables below are generated from `server/api/`, `server/middleware/auth.ts`, and `config/backend.config.json` by `npm run docs`.

| Access | Meaning |
|--------|---------|
| Public | Anyone. Member routes without a guard authenticate the request themselves, for example with Kürzel and PIN. |
| Team | Anyone with the link, or with the team access code if one is set |
| Member | A signed-in employee (personal app access) |
| Login | Any signed-in planner or admin |
| Planner | Planners and admins |
| Admin | Admins only |

CSRF applies to writes that use the planner session cookie. Requests with a Bearer token from the app need no CSRF token.

<!-- AUTO-GENERATED-API-START -->
### Staff

| Method | Endpoint | Access | CSRF | Query | Body | Description |
|--------|----------|--------|------|-------|------|-------------|
| `GET` | `/api/staff` | Team | No | - | - | List staff records |
| `POST` | `/api/staff` | Admin | Yes | - | `active`, `is_parttime`, `name`, `short_code` | Create or update staff data |
| `GET` | `/api/staff/:id` | Team | No | - | - | Read one staff record |
| `PATCH` | `/api/staff/:id` | Admin | Yes | - | `active`, `is_parttime`, `name`, `short_code` | Update one staff record |
| `DELETE` | `/api/staff/:id` | Admin | Yes | - | - | Delete one staff record |
| `DELETE` | `/api/staff/:id/pin` | Planner | Yes | - | - | Delete one staff record |

### Shift

| Method | Endpoint | Access | CSRF | Query | Body | Description |
|--------|----------|--------|------|-------|------|-------------|
| `GET` | `/api/shift` | Team | No | - | - | List shift records |
| `POST` | `/api/shift` | Admin | Yes | - | `color`, `end_time`, `min_staff`, `name`, `sort_order`, `start_time` | Create or update shift data |
| `GET` | `/api/shift/:id` | Team | No | - | - | Read one shift record |
| `PATCH` | `/api/shift/:id` | Admin | Yes | - | `active`, `color`, `end_time`, `min_staff`, `name`, `sort_order`, `start_time` | Update one shift record |
| `DELETE` | `/api/shift/:id` | Admin | Yes | - | - | Delete one shift record |

### Shiftplan

| Method | Endpoint | Access | CSRF | Query | Body | Description |
|--------|----------|--------|------|-------|------|-------------|
| `GET` | `/api/shiftplan` | Team | No | `week`, `year` | - | List shiftplan records |
| `POST` | `/api/shiftplan/assign` | Planner | Yes | - | `shift_id`, `staff_id`, `week`, `year` | Assign staff to a weekly shift |
| `POST` | `/api/shiftplan/copy-year` | Planner | Yes | - | `overwrite`, `sourceYear`, `targetYear` | Copy shift plans between years |
| `POST` | `/api/shiftplan/day-change` | Planner | Yes | - | `present` | Put someone into or out of a shift for one day |
| `POST` | `/api/shiftplan/generate` | Planner | Yes | - | `overwrite`, `week`, `weeks`, `year` | Generate plans from the rotation pattern |
| `GET` | `/api/shiftplan/generate-preview` | Planner | No | `week`, `weeks`, `year` | - | Preview which weeks a rollout would fill or overwrite |
| `POST` | `/api/shiftplan/unassign` | Planner | Yes | - | `shift_id`, `staff_id`, `week`, `year` | Remove staff from a weekly shift |
| `GET` | `/api/shiftplan/year-summary` | Team | No | `year` | - | Read yearly planning coverage |

### Rotation

| Method | Endpoint | Access | CSRF | Query | Body | Description |
|--------|----------|--------|------|-------|------|-------------|
| `GET` | `/api/rotation` | Team | No | - | - | List rotation records |
| `POST` | `/api/rotation/assign` | Planner | Yes | - | `pattern_week`, `shift_id`, `staff_id` | Create or update rotation data |
| `GET` | `/api/rotation/config` | Team | No | - | - | List rotation records |
| `PATCH` | `/api/rotation/config` | Planner | Yes | - | `cycle_length`, `start_week`, `start_year` | Update one rotation record |
| `POST` | `/api/rotation/excel-import` | Planner | Yes | - | - | Create or update rotation data |
| `GET` | `/api/rotation/excel-template` | Planner | No | - | - | List rotation records |
| `POST` | `/api/rotation/unassign` | Planner | Yes | - | `pattern_week`, `shift_id`, `staff_id` | Create or update rotation data |

### Auth

| Method | Endpoint | Access | CSRF | Query | Body | Description |
|--------|----------|--------|------|-------|------|-------------|
| `POST` | `/api/auth/change-password` | Login | Yes | - | `currentPassword`, `newPassword` | Change the current user's password |
| `POST` | `/api/auth/login` | Public | No | - | `client`, `password`, `username` | Create a session and CSRF token |
| `POST` | `/api/auth/logout` | Login | Yes | - | - | Clear the current session |
| `GET` | `/api/auth/session` | Public | No | - | - | Read the current session state |
| `GET` | `/api/auth/users` | Admin | No | - | - | List application users |
| `POST` | `/api/auth/users` | Admin | Yes | - | `password`, `role`, `username` | Create an application user |
| `DELETE` | `/api/auth/users/:id` | Admin | Yes | - | - | Delete an application user |

### Audit

| Method | Endpoint | Access | CSRF | Query | Body | Description |
|--------|----------|--------|------|-------|------|-------------|
| `GET` | `/api/audit` | Admin | No | `limit`, `offset`, `week`, `year` | - | List audit log entries |

### Holidays

| Method | Endpoint | Access | CSRF | Query | Body | Description |
|--------|----------|--------|------|-------|------|-------------|
| `GET` | `/api/holidays/public` | Team | No | `week`, `year` | - | Read public holidays |
| `GET` | `/api/holidays/school` | Team | No | `states`, `week`, `year` | - | Read school holidays |

### Absences

| Method | Endpoint | Access | CSRF | Query | Body | Description |
|--------|----------|--------|------|-------|------|-------------|
| `GET` | `/api/absences` | Team | No | `week`, `year` | - | List absences records |
| `POST` | `/api/absences` | Planner | Yes | - | `reason`, `shiftId` | Create or update absences data |
| `DELETE` | `/api/absences/:id` | Planner | Yes | - | - | Delete one absences record |

### Analytics

| Method | Endpoint | Access | CSRF | Query | Body | Description |
|--------|----------|--------|------|-------|------|-------------|
| `GET` | `/api/analytics` | Admin | No | `days` | - | List analytics records |
| `POST` | `/api/analytics/visit` | Public | No | `path` | `path` | Create or update analytics data |

### Contact

| Method | Endpoint | Access | CSRF | Query | Body | Description |
|--------|----------|--------|------|-------|------|-------------|
| `POST` | `/api/contact` | Public | No | - | `company`, `message`, `name`, `replyTo`, `subject` | Create or update contact data |
| `GET` | `/api/contact/messages` | Admin | No | `limit`, `offset` | - | List contact records |
| `PATCH` | `/api/contact/messages/:id` | Admin | Yes | - | - | Update one contact record |

### Instance

| Method | Endpoint | Access | CSRF | Query | Body | Description |
|--------|----------|--------|------|-------|------|-------------|
| `GET` | `/api/instance` | Team | No | - | - | List instance records |

### Member-invites

| Method | Endpoint | Access | CSRF | Query | Body | Description |
|--------|----------|--------|------|-------|------|-------------|
| `POST` | `/api/member-invites` | Planner | Yes | - | - | Create or update member-invites data |

### Member-sessions

| Method | Endpoint | Access | CSRF | Query | Body | Description |
|--------|----------|--------|------|-------|------|-------------|
| `GET` | `/api/member-sessions` | Planner | No | - | - | List member-sessions records |
| `DELETE` | `/api/member-sessions/:id` | Planner | Yes | - | - | Delete one member-sessions record |
| `GET` | `/api/member-sessions/pins` | Planner | No | - | - | List member-sessions records |

### Member

| Method | Endpoint | Access | CSRF | Query | Body | Description |
|--------|----------|--------|------|-------|------|-------------|
| `POST` | `/api/member/absences` | Member | No | - | `reason`, `shiftId` | Create or update member data |
| `DELETE` | `/api/member/absences/:id` | Member | No | - | - | Delete one member record |
| `POST` | `/api/member/login` | Public | No | - | `deviceName`, `pin`, `shortCode` | Sign in with Kürzel and PIN |
| `POST` | `/api/member/logout` | Public | No | - | - | Create or update member data |
| `GET` | `/api/member/me` | Member | No | - | - | Read the signed-in employee |
| `PUT` | `/api/member/pin` | Member | No | - | `currentPin`, `pin` | Set or change the own PIN |
| `POST` | `/api/member/redeem` | Public | No | - | `code`, `deviceName` | Redeem a personal QR code |
| `GET` | `/api/member/requests` | Member | No | - | - | List member records |
| `POST` | `/api/member/requests` | Member | No | - | `shiftId` | Create or update member data |
| `POST` | `/api/member/requests/:id` | Member | No | - | - | Create or update member data |

### Push

| Method | Endpoint | Access | CSRF | Query | Body | Description |
|--------|----------|--------|------|-------|------|-------------|
| `POST` | `/api/push/devices` | Team | No | - | - | Create or update push data |
| `DELETE` | `/api/push/devices` | Team | No | - | - | Delete one push record |
| `POST` | `/api/push/notify` | Planner | Yes | - | - | Create or update push data |
| `GET` | `/api/push/status` | Planner | No | - | - | List push records |
| `POST` | `/api/push/subscribe` | Team | No | - | - | Create or update push data |
| `POST` | `/api/push/unsubscribe` | Team | No | - | - | Create or update push data |

### Requests

| Method | Endpoint | Access | CSRF | Query | Body | Description |
|--------|----------|--------|------|-------|------|-------------|
| `GET` | `/api/requests` | Planner | No | - | - | List requests records |
| `POST` | `/api/requests/:id` | Planner | Yes | - | - | Create or update requests data |
| `PUT` | `/api/requests/settings` | Planner | Yes | - | `requiresApproval` | API endpoint |

### Team-access

| Method | Endpoint | Access | CSRF | Query | Body | Description |
|--------|----------|--------|------|-------|------|-------------|
| `GET` | `/api/team-access` | Admin | No | - | - | List team-access records |
| `POST` | `/api/team-access` | Admin | Yes | - | `instanceName` | Create or update team-access data |

### Viewer

| Method | Endpoint | Access | CSRF | Query | Body | Description |
|--------|----------|--------|------|-------|------|-------------|
| `POST` | `/api/viewer/login` | Team | No | - | `code` | Unlock the plan with the team access code |
| `POST` | `/api/viewer/logout` | Team | No | - | - | Create or update viewer data |
| `GET` | `/api/viewer/status` | Team | No | - | - | List viewer records |
<!-- AUTO-GENERATED-API-END -->
