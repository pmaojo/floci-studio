# Floci Studio — Marketplace

Manage Docker Compose marketplace recipes (browse, deploy, teardown).

## Arguments

`$ARGUMENTS` action and optional recipe ID:
- (none) → list all available recipes
- `status` → list current installations
- `deploy <recipe_id> [key=value ...]` → deploy a recipe with optional variables
- `teardown <recipe_id>` → stop and remove a recipe
- `logs <recipe_id>` → show logs for a running recipe

## Steps

### List (no args)
1. Call `list_marketplace_recipes` — show name, description, category, and required variables for each recipe.
2. Call `get_marketplace_installations` — mark which recipes are currently running.

### Deploy
1. Call `list_marketplace_recipes` if no recipe_id is given — ask the user to pick one.
2. Parse any `key=value` pairs from `$ARGUMENTS` into a variables dict.
3. If the recipe has required variables not provided, list them and ask for values.
4. Call `deploy_marketplace_app` with the recipe_id and vars dict.
5. Report the deployment URL, exposed ports, and any credentials generated.

### Teardown
1. Call `teardown_marketplace_app` with the recipe_id.
2. Confirm teardown is complete.

### Logs
1. Call `get_marketplace_logs` with the recipe_id.
2. Display the last 50 lines, formatted as a code block.
