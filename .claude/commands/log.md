# /log

Log a real measurement with site, operator, timestamp, kind and retention date. Cooling timestamps refer to observed 60C, 21C and 5C checkpoints. Do not infer temperatures from elapsed time.

Run `node scripts/food.mjs log <check-json> --json`. Read from the database first, report missing facts, and never send. Use argument arrays for JSON values when invoking from another program.
