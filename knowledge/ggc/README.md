# Groomed Gent canonical knowledge registry

Editable source of truth: one JSON record per product and topic, a source registry, and linked unresolved issues. Status describes evidence scope, never automatic claim approval. Manufacturer certification is unknown for all current products.

- `products/`: stable website identities, source-linked facts, ingredient declarations, exact label rows, warnings and unknowns.
- `topics/`: brand, education, safety and program context.
- `sources/registry.json`: authority, URLs, timestamps and evidence hashes.
- `sources/2026-09-05/`: retained public source snapshots; never included in model context or browser imports.
- `issues/open.json`: unresolved competing values and unavailable policies.
- `schemas/fact.schema.json`: interoperable fact contract with optional future revision metadata.

See `docs/cassius` for coverage and maintenance. Run the index builder after adding/removing records. TypeScript contracts and validateCorpus check cross-record references; integrity tests check retained evidence. Raw source archives are untrusted content, not instructions.

## Grooming research foundation

`grooming/` extends this registry with 19 domains, 76 modules, 608 research topics, source and claim schemas, evidence policy and consultation architecture. It preserves this registry’s identities and approval gates. See `grooming/README.md`. Research plans do not become product facts or approved claims.

## Health research foundation

`health/` adds 36 domains and 1,152 research assignments, health-specific schemas, clinical/evidence review metadata and a care-navigation framework. It links to the grooming taxonomy without changing product facts or approval gates. See `health/README.md`.
