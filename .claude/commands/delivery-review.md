# /delivery-review

Review held and rejected deliveries by supplier and batch. Never release food on the basis of this report.

Run `node scripts/food.mjs delivery-review --json`. Read from the database first, report missing facts, and never send. Use argument arrays for JSON values when invoking from another program.
