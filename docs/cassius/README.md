# Cassius Groomed Gent knowledge

Local implementation, September 5, 2026. No deployment or production data mutation.

Start with [coverage and gaps](coverage.md), [architecture](architecture.md), and [maintenance](maintenance.md). Structured records live in `knowledge/ggc/products`, `topics`, `sources`, and `issues`. These are the editable source of truth; the import index is generated, not a second knowledge database.

Cassius now uses OpenAI through a server-only endpoint in the existing question workspace, reusing this registry and enforcing hard evidence boundaries. See [runtime configuration, safeguards and verification](openai-runtime.md). Website claims are observations, not a legal approval or manufacturer certification.

## Men’s Grooming Intelligence foundation

The 19-domain extension adds 76 modules and 608 research topics across Foundation, Mastery, Advanced and Frontier. Start with [grooming architecture](grooming/architecture.md), [full curriculum](grooming/curriculum.md), [consultation framework](grooming/consultation-framework.md), and [ingestion roadmap](grooming/ingestion-roadmap.md). Structured assets live in `knowledge/ggc/grooming`. All scientific topics begin unassessed; no scientific claim is released by this foundation build. Cassius can now surface the curriculum and structure consultation questions through the existing gateway.

## Men’s Health, Wellness, Hormones & Biohacking

The parallel health foundation adds 36 domains, 144 modules and 1,152 topics. Start with [the health architecture](health/architecture.md), [curriculum](health/curriculum.md), [consultation framework](health/consultation-framework.md) and [ingestion roadmap](health/ingestion-roadmap.md). All health topics begin unassessed; clinical review and source ingestion are required before health claims are released. Structured records live in `knowledge/ggc/health`.
