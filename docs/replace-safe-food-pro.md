# Replace Safe Food Pro records

Safe Food Pro documents CSV export of supplier, equipment and staff lists: [export instructions](https://support.safefoodpro.com/article/445-exporting-supplier-equipment-or-staff-lists), checked 28 September 2026. In its Administration Console, open the relevant list and use the export icon. Keep each original file. Its [release notes](https://www.safefoodpro.com/releases) also describe resource CSV exports and form reports, but do not establish one universal form-export layout.

## Bring a mapped export across in one command

1. Start in a new database. Run npm run migrate without the demo seed. Add your sites, timezone and reviewed category using the CLI.
2. Put the original CSV files in one folder. Copy fixtures/mapping.json and map your actual headings. The fixture headings are our importer contract, not a vendor-certified sample. Use null to deliberately retain an unused column in provenance without copying it into the domain record. Any unmapped column stops the import.
3. Set site_id in defaults to the actual site UUID. Each file names entity, columns and optionally a source key. Use resolve for explicitly mapped relationships, for example {"site_id":"sites"}. Name ambiguity stops the import. Missing measurements, training dates and certificates must not be invented. Missing optional values remain null.
4. Run a rollback preview, then the same import without --dry-run:

```bash
node scripts/food.mjs import safe-food-pro /path/to/exports --dry-run --json
node scripts/food.mjs import safe-food-pro /path/to/exports --json
```

Supported entities: sites, staff, suppliers, equipment, checks, cleaning, deliveries, actions. Lists map naturally to the first four. Custom form history needs a reviewed mapping, exact ISO timestamps with timezone, and actual measurement fields. A PDF is an evidence archive, not an automatically parsed temperature record. Retain original reports, photos, signatures, certificates and sensor history separately.

Every file in one manifest imports in one transaction. Preview rolls back domain and audit changes. An exact repeat is skipped. A configured stable key with changed data stops for reconciliation. If the vendor provides no stable key, the complete row fingerprint identifies exact repeats only. Changed rows are new records; compare exports before reimporting changed files. No automatic overwrite is performed. The original fields and a fingerprint stay in import_records.

Columns may map to an allowed field or null. Do not map two headings to the same field. Defaults supply operator-confirmed missing context, never observations. Unknown fields and invalid numbers, dates, booleans or relationships stop the transaction.

## Reconcile before the switch

Compare each imported count with its export. Check several supplier, staff and equipment rows against the source. Match dates, timezones, certificate references, cooling checkpoints and batch identifiers. List the files and history that stayed in the archive. Generate an inspection pack and ask the food safety supervisor to review it. Agree the capture method, access permissions, backups and restore process before ending the incumbent service.

The free base has no mobile app, offline capture, sensor connection, push notification service or external auditor login. Enterprise DNA can build and connect those parts for your version. A switch in a day is a mapped-list import path, not a promise that every custom form and integration migrates untouched.

`export <new-folder>` writes a complete JSON snapshot including audit history, import provenance and migration names. This is not a Safe Food Pro import file and does not copy referenced documents. Preserve database backups and the evidence archive for recovery.
