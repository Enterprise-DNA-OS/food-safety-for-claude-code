export const fields = {
  "sites": [
    "name",
    "category",
    "timezone",
    "active"
  ],
  "staff": [
    "site_id",
    "name",
    "role",
    "active",
    "trained_on",
    "training_ref",
    "supervisor",
    "certificate_date",
    "certificate_ref",
    "available"
  ],
  "suppliers": [
    "name",
    "contact",
    "approval_due",
    "evidence_ref"
  ],
  "equipment": [
    "site_id",
    "name",
    "kind",
    "calibration_due",
    "active"
  ],
  "checks": [
    "site_id",
    "equipment_id",
    "name",
    "kind",
    "observed_at",
    "operator",
    "temperature_c",
    "cooled_21_at",
    "cooled_5_at",
    "evidence_ref",
    "notes",
    "retain_until"
  ],
  "cleaning": [
    "site_id",
    "name",
    "due_at",
    "completed_at",
    "operator",
    "method",
    "evidence_ref"
  ],
  "deliveries": [
    "site_id",
    "supplier_id",
    "name",
    "batch",
    "received_at",
    "temperature_c",
    "state",
    "operator",
    "evidence_ref",
    "notes"
  ],
  "actions": [
    "site_id",
    "check_id",
    "name",
    "owner",
    "due_at",
    "closed_at",
    "resolution",
    "evidence_ref"
  ]
};
