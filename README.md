# Food Safety for Claude Code

Temperature records, cooling checks, cleaning, deliveries and corrective actions in a database you own. Built by Enterprise DNA. MIT licence.

| Do it yourself | We customise it | We run it for you |
| --- | --- | --- |
| Free source. Follow the quick start. | Your food-safety records, rules, Safe Food Pro mapping, reports, phone interface or different stack. | Installed, connected and operated through Omni. One setup fee, then a retainer. |

[Talk to Sam](https://enterprisedna.co/omni/book?offer=replace-software&utm_campaign=safe-food-pro&utm_medium=readme) · [Instead of Safe Food Pro](https://enterprisedna.co/omni/instead-of/safe-food-pro)

Works with Claude Code, Codex, OpenCode or Cursor. Read AGENTS.md and CLAUDE.md.

## Quick start

```bash
git clone https://github.com/Enterprise-DNA-OS/food-safety-for-claude-code.git
cd food-safety-for-claude-code
npm install
npm run demo
npm run food -- weekly-review
npm run view
npm run docs
```

Node 20 or newer. PGlite needs no separate database installation. DATABASE_URL selects Postgres. The SQL uses no extensions. The fictional demo contains two Australian sites, three staff, a warm milk reading, late cooling checkpoints, an expired supervisor certificate, held deliveries and overdue cleaning. Seed is idempotent and does not overwrite existing rows.

Use a fresh DATA_DIR or empty managed database for real operations. Run npm run migrate without seed, add your sites, then import mapped records. Hosting, agent subscriptions, devices and operational support are separate from the free source licence.

## The week's work

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

All CLI routes accept --json. `help --json` lists fields. Read one record with `record <entity> <name-or-id>`. Case-insensitive names and UUID prefixes work; ambiguous matches list candidates and exit 1. Relationships in writes use full UUIDs. Dates use YYYY-MM-DD. Timestamps include a timezone. Windows callers should use an argument array for JSON payloads.

Writes have database-triggered audit entries. Observed checks and deliveries are append-only through the CLI. Correct mistakes by adding an action that references the original check. Closed actions and completed cleaning cannot be rewritten through ordinary updates. Database administrators can alter history; this is not a tamper-proof archive.

## Compliance and documents

[The cited checks](docs/compliance.md) cover selected Australian record gaps, default temperature and cooling controls, supervisor certificate evidence and retention. They do not certify food safety or replace a supervisor, training provider or inspector. NZ rules are outside this build. Alternative approved methods require a reviewed rule change and evidence.

`npm run docs` writes per-site inspection packs, cleaning registers, corrective action registers and delivery registers. `npm run view` renders opening records, overdue work, temperature review, staff evidence and suppliers. Change business name, logo and colours in brand.json. Drafts never send. Evidence references do not preserve the underlying files; back up the evidence archive too.

## Ten questions across your kitchen

Safe Food Pro already has reporting, custom dashboards and analysis. These are questions this build answers now, not unsupported claims that the incumbent cannot answer them.

1. Which fridges have no recorded check today at their own site? (`opening-checks`)
2. Which food measurements need a supervisor review? (`temperature-review`)
3. Which cooling batches missed a checkpoint or the default time limit? (`cooling-review`)
4. Which cleaning jobs are overdue and who owns them? (`cleaning-due`)
5. Which suppliers have held or rejected deliveries and an overdue review? (`supplier-review`)
6. Which batch identifiers belong to held deliveries? (`delivery-review`)
7. Which sites lack current supervisor certificate evidence? (`compliance`)
8. Which active staff have no recorded training evidence? (`training-review`)
9. Which records have a retention date below the three-month floor? (`retention + compliance`)
10. What should each site manager follow up this Monday? (`weekly-review`)

## Your first hour: ten things to ask for

1. Put our business name and logo on the inspection pack.
2. Add our sites and their timezones.
3. Record our reviewed category at each site.
4. Map the headings in our supplier export.
5. Add our supervisor certificates and references.
6. Add the cleaning jobs for our opening and closing shifts.
7. Add our batch naming convention.
8. Add a report for deliveries held by supplier.
9. Add our approved cooling method with its evidence.
10. Draft a follow-up for each overdue action owner.

Use /customise to keep migrations, rules, imports and tests together.

## Switching and operating

[The replace guide](docs/replace-safe-food-pro.md) covers the documented supplier, staff and equipment CSV exports, a one-command mapped import, preview rollback and reconciliation. Custom form history needs explicit mapping. Fixtures are examples of this importer's contract, not genuine vendor exports. Unknown columns fail closed. Exact repeats skip; changed stable keys stop for review. Original fields are retained in provenance.

[Why no front end](docs/why-no-front-end.md) explains capture limits. This is a manager's record desk, with read-only documents. No mobile app, offline entry, automated sensor capture or food-release decision is included. The team needs an agreed observation and entry process before switching. A managed database also needs permissions and tested backups.

## Validation

npm test uses an isolated temporary database, runs migrations and seed twice, exercises every CLI route, checks boundary temperatures and cooling times, ambiguity, malformed imports, transaction rollback, cross-site relationships, audit history, append-only records and escaped documents. CI defines the same tests on Windows and Linux and against disposable Postgres. Local results report the adapter actually tested.
