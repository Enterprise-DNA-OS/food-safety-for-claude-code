# /close-action

Read the action, obtain the actual resolution and evidence reference, then record closure. This does not certify that food is safe.

Run `node scripts/food.mjs close-action <id-or-name> <resolution> <evidence-ref> --json`. Read from the database first, report missing facts, and never send. Use argument arrays for JSON values when invoking from another program.
