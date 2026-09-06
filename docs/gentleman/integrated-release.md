# Integrated release

Includes the remaining Cassius conversation layout, Product Mastery curriculum/learning workspace, and Creator Studio entry updates from the existing local checkouts. Preserves the current Command theatre and permanent purple/bronze-gold palette.

Migration reconciliation: the new Product Learning table is migration 0002 after the existing 0001 Gentleman memory migration. SQLite and Postgres schemas and migration snapshots both include the table. Existing migrations were preserved. The merge retained both memory and learning authorization routes and tests.

Database scripts are shipped but are not applied to an unconfigured remote database. Account activation remains gated by its documented provider configuration. Learning progress in account mode requires the new migration; no fake cloud persistence is claimed. Local preview behavior remains supported.
