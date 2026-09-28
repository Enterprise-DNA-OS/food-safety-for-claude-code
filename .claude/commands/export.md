# /export

Export the complete database snapshot to a new folder. It includes audit and import provenance, but not the files referenced by evidence paths.

Run `node scripts/food.mjs export <new-folder> --json`. Read from the database first, report missing facts, and never send. Use argument arrays for JSON values when invoking from another program.
