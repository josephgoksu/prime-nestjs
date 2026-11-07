# Organizations (multi-tenancy)

Organizations let a B2B app group users into companies or teams that share data. B2C apps can ignore them: without an organization, every user works with their own personal data.

## Model

- `Organization`: a tenant with a name.
- `Membership`: links a user to an organization with a role: `owner`, `admin` or `member`. A user can belong to many organizations.
- `Task.organizationId`: set for organization tasks, `null` for personal tasks. Use the same column pattern for your own tenant data.

## Choosing the organization

Routes with an `:orgId` path parameter use it. Other routes read the `X-Organization-Id` header:

```bash
# Personal tasks
curl -H "Authorization: Bearer $TOKEN" localhost:3000/tasks

# Tasks of organization 3
curl -H "Authorization: Bearer $TOKEN" -H "X-Organization-Id: 3" localhost:3000/tasks
```

`OrganizationGuard` loads the caller's membership and answers:

| Case | Response |
|---|---|
| No organization given | Personal scope (or 400 on routes that need one) |
| Malformed id or empty header | 400 |
| Caller is not a member | 404, so organization ids cannot be probed |
| Caller's role is too low | 403 |

## Endpoints

| Method | Path | Minimum role |
|---|---|---|
| `POST` | `/organizations` | any user (becomes owner) |
| `GET` | `/organizations` | any user (lists their organizations) |
| `GET` | `/organizations/:orgId` | member |
| `PATCH` | `/organizations/:orgId` | admin |
| `DELETE` | `/organizations/:orgId` | owner (deletes its memberships and tasks) |
| `GET` | `/organizations/:orgId/members` | member |
| `POST` | `/organizations/:orgId/members` | admin. Adds an existing user by email |
| `PATCH` | `/organizations/:orgId/members/:userId` | admin |
| `DELETE` | `/organizations/:orgId/members/:userId` | admin, or the member themselves to leave |

## Role rules

- Admins manage members and other admins.
- Only owners grant, change or remove the owner role.
- An organization always keeps at least one owner.
- In organization tasks, every member can read and edit; only the task's creator or an admin can delete.

Membership changes take a row lock on the organization and re-read the caller's role inside it. Two owners demoting each other at the same time cannot leave the organization without an owner, and an admin who was just demoted cannot act on their old role.

## Scoping your own feature

Follow `src/tasks/`:

```ts
@Controller('projects')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class ProjectsController {
  @Get()
  findAll(@CurrentUser() user: User, @CurrentMembership() membership: Membership | undefined) {
    return this.projects.findAll({ userId: user.id, membership });
  }
}
```

```ts
// In the service: one place decides the scope of every query.
function whereScope(scope: TaskScope): FindOptionsWhere<Task> {
  return scope.membership
    ? { organizationId: scope.membership.organizationId }
    : { ownerId: scope.userId, organizationId: IsNull() };
}
```

Use `@RequireOrgRole(OrgRole.ADMIN)` on a route that needs an organization and a minimum role.

## Not included

- Invitations. Members are added by the email of an existing account, and the endpoint has the stricter rate limit because it reveals whether an email is registered. Add an invitation flow if your product needs one.
- Per-tenant databases or schemas. Tenants share tables and are separated by `organizationId`.
