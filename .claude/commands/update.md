# /update

Read the existing record first. Update only supplied facts. Checks and deliveries are append-only. Completed cleaning and closed actions cannot be edited through this command.

Run `node scripts/food.mjs update <entity> <id-or-name> <json> --json`. Read from the database first, report missing facts, and never send. Use argument arrays for JSON values when invoking from another program.
