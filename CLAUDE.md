# Food Safety for Claude Code

For Australian cafe, catering and restaurant managers reviewing their own food-safety records. Set your business identity in brand.json. The demo uses fictional records.

## Routing

- `/sites`: Review the site register and recorded category. Confirm unknown categories with the operator and local regulator.
- `/staff`: Review the staff register, appointed supervisors and certificate references.
- `/suppliers`: Read supplier contacts, evidence references and review dates.
- `/equipment`: Read equipment, its site and calibration review dates.
- `/checks`: Read the recorded measurements. Never turn a missing value into a passing reading.
- `/cleaning`: Read scheduled and completed cleaning records.
- `/deliveries`: Read incoming batches, measured temperatures and the recorded receipt decision.
- `/actions`: Read corrective actions with their owners and closure evidence.
- `/opening-checks`: List equipment without a measurement today in its site timezone. This daily cadence is a demo policy, not a legal frequency.
- `/temperature-review`: Review cold, hot and cooling records. An out-of-limit result needs the responsible food safety supervisor, not an invented disposition.
- `/cooling-review`: Review both cooling checkpoints against the default method. Missing readings remain missing.
- `/cleaning-due`: List overdue cleaning, assign follow-up to the recorded owner and check the actual completion evidence.
- `/delivery-review`: Review held and rejected deliveries by supplier and batch. Never release food on the basis of this report.
- `/supplier-review`: Compare held and rejected deliveries with supplier review dates.
- `/training-review`: Review missing training evidence, supervisor certificates and availability.
- `/attention`: List overdue corrective actions and cleaning with responsible people.
- `/compliance`: Read docs/compliance.md, then run the cited record checks. Explain the distinction between a record gap, a policy reminder and a legal requirement. No certification claims.
- `/retention`: Review retained records and the three-month floor. No deletion command exists. Back up evidence files separately.
- `/audit`: Read the database-triggered before and after history. The database administrator can alter it, so do not call it tamper proof.
- `/weekly-review`: Run opening-checks, attention, temperature-review, training-review and compliance. Write a Monday plan with each site, finding, owner and next action. Do not claim work was completed.
- `/record`: Read one entity by full name, unique name fragment or UUID prefix. Ambiguity must be shown to the operator.
- `/add`: Use help to read allowed fields, then add the record from operator-supplied facts. Relationships require full UUIDs. Do not infer measurement results.
- `/update`: Read the existing record first. Update only supplied facts. Checks and deliveries are append-only. Completed cleaning and closed actions cannot be edited through this command.
- `/log`: Log a real measurement with site, operator, timestamp, kind and retention date. Cooling timestamps refer to observed 60C, 21C and 5C checkpoints. Do not infer temperatures from elapsed time.
- `/close-action`: Read the action, obtain the actual resolution and evidence reference, then record closure. This does not certify that food is safe.
- `/draft-inspection`: Read the site records, then write a draft inspection pack into drafts. Review the records and evidence before sharing. Never send.
- `/draft-corrective`: Read the site records, then draft a corrective-action follow-up into drafts. Keep it internal until reviewed. Never send.
- `/import`: Read docs/replace-safe-food-pro.md. Map the real headings, run the rollback preview, inspect counts, then import the same folder. Keep source files and reconcile the imported rows.
- `/export`: Export the complete database snapshot to a new folder. It includes audit and import provenance, but not the files referenced by evidence paths.
- `/customise`: Add a field, rename a workflow or change a site policy with a tested migration.
- `/new-view`: Create a branded, read-only report from the records.

## Operating rules

Read the matching .claude/commands file, then run scripts/food.mjs. Every answer starts with current database records. Never invent temperatures, evidence, training, timestamps or food disposition. Show ambiguous matches and ask the operator to select one. The operator and their food safety supervisor make food decisions.

Read docs/compliance.md before interpreting findings. This is a records tool, not a regulatory approval or a food-release service. AU rules do not cover NZ. Draft into drafts only. Never send, delete, publish, or submit a regulatory filing. No delete command exists. Changes to observed records use a corrective action and preserved original history.

Use a fresh DATA_DIR for production setup, or a managed DATABASE_URL with least-privilege roles and backups. Do not seed real operations. Access controls for a shared team must be configured before use. Back up the evidence archive as well as the database. No passwords or personal records in source control.

Use npm test for temporary-database checks, npm run demo for fictional records, npm run docs for paperwork and npm run view for read-only reports. Windows and Linux run the same Node scripts.
