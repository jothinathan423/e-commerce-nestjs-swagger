# Contributing

## Commit Message Convention

This repo enforces [Conventional Commits](https://www.conventionalcommits.org/) via `commitlint` and a `husky` git hook. Commits that don't follow the format will be **rejected automatically**.

### Format

```
<type>(<scope>): <subject>
```

- `<type>` — required, must be one of the allowed types below.
- `<scope>` — optional, a short noun describing the affected area (e.g. `auth`, `cart`).
- `<subject>` — required, short description of the change.

### Allowed Types

| Type       | Purpose                                                   |
| ---------- | --------------------------------------------------------- |
| `feat`     | A new feature                                             |
| `fix`      | A bug fix                                                 |
| `docs`     | Documentation only changes                                |
| `style`    | Formatting, whitespace, semicolons (no code change)       |
| `refactor` | Code change that neither fixes a bug nor adds a feature   |
| `perf`     | Performance improvement                                   |
| `test`     | Adding or updating tests                                  |
| `build`    | Build system or external dependency changes               |
| `ci`       | CI configuration changes                                  |
| `chore`    | Routine tasks, maintenance                                |
| `revert`   | Revert a previous commit                                  |
| `create`   | Initial creation of a module/feature                      |

### Examples

**Valid:**

```
feat(cart): add bulk item removal endpoint
fix: correct DNS resolver for MongoDB SRV lookup
docs: update README with setup instructions
refactor(orders): simplify status transition logic
chore: bump dependencies
```

**Invalid (will be rejected):**

```
updated stuff
fixed bug
WIP
add feature        # missing type prefix
Feat: new feature  # type must be lowercase
```

## Setup

After cloning:

```bash
npm install
```

This installs dependencies and sets up the git hooks automatically via the `prepare` script.
