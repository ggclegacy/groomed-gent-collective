# Legacy Sanctum Product Brain audit — September 6, 2026

First-party authority: [Groomed Gent Co. Legacy Sanctum collection](https://groomedgentco.com/collections/legacy-sanctum). This is a dated source capture, not manufacturer certification, claims approval, or scientific enrichment.

## Coverage

The collection membership feed contains 11 products across nine formula families. Page 2 is empty. Every member has an independently retrieved HTML page, product-data response, and complete HTML Supplement Facts table. All 19 linked product images were downloaded and inspected (the three Hydros hero images are byte-identical). Eight secondary images include Supplement Facts. Collection links also include Hydros Lemonade, which returns HTTP 404 and is absent from membership. Its explicit unknown dossier prevents flavor substitution. Barber’s Blend is a global footer/search link, not a collection member.

| Product (exact catalog title) | Supplement Facts capture | Follow-up |
|---|---|---|
| HYDROS— Advanced Hydration Powder (Peach Mango) | Complete website table, 13 rows | Conflicts/limitations below |
| Hydros — Advanced Hydration Powder (Golden Lychee) | Complete website table, 13 rows | Conflicts/limitations below |
| HYDROS— Advanced Hydration Powder (Passion Fruit) | Complete website table, 13 rows | Conflicts/limitations below |
| Vitalis NMN — Cellular Energy Formula | Complete website table, 1 rows | No formula conflict found |
| GENESIS — Gut Health & Microbiome Formula | Complete website table, 4 rows | Conflicts/limitations below |
| RESTORIA — Magnesium Glycinate | Complete website table, 1 rows | Conflicts/limitations below |
| NOCTURNE — Sleep Support Formula | Complete website table, 5 rows | Conflicts/limitations below |
| SOLARIS — Male Vitality Formula | Complete website table, 8 rows | Conflicts/limitations below |
| ASCEND — Cognitive Performance Formula(Sour Candy) | Complete website table, 16 rows | Conflicts/limitations below |
| NAD+ | Complete website table, 3 rows | Conflicts/limitations below |
| FORTIUS AQUA Creatine + Electrolyte Performance Formula | Complete website table, 5 rows | Conflicts/limitations below |
| Hydros Lemonade (collection link label: Lemonade) | Unavailable — HTTP 404 | Provide current product page/label or remove broken link |

“Complete” means all displayed label rows were captured. It does not mean undisclosed blend-member quantities, inactive ingredient amounts, or missing Daily Values were supplied.

## Information Neil needs to resolve

- **Hydros, all three live flavors:** current B6 form (page Pyridoxine HCl versus stored Pyridoxal 5 Phosphate); B5/pantothenic acid omitted from stored ingredient list; color ingredient varies between page and stored description. Peach Mango and Passion Fruit label images specifically list Beta Carotene while their HTML lists Beet Juice Powder. Peach Mango/Passion Fruit use a Golden Lychee hero image. Confirm each flavor independently.
- **Nexus/NAD+:** 98% resveratrol in HTML/description versus 96% in the label image; catalog name NAD+ versus NEXUS branding. Do not derive pure resveratrol milligrams.
- **Restoria:** label/page gives 275 mg elemental magnesium from 2,500 mg magnesium glycinate per three capsules; stored description incorrectly or ambiguously says each capsule. Confirm the label basis.
- **Ascend:** 20 servings × 8 g implies 160 g, but stored product net weight says 150 g. This arithmetic flags a conflict; it does not replace either source value. Confirm fill weight and serving count.
- **Genesis:** narrative says 1–2 servings daily but directions specify two capsules daily. Net 76 g exceeds gross 73 g. Supply current directions/weights, DigeZyme composition/activity units if needed, and any CFU guarantee at expiration (the site only promises CFU at manufacture).
- **Nocturne:** 905 mg blend total, all 14 members disclosed, individual member amounts unknown. Collection timing 30–60 minutes versus stored directions 20–30 minutes before bed.
- **Fortius Aqua:** $52.99 page price versus $49.99 collection/product-data price; numeric Daily Values are absent.
- **Every product:** formula version, individual inactive amounts and undisclosed supplier/manufacturer specifications remain unknown. No claims became approved merely because the website displays them.

## Integration

The existing Product Brain ingestion flow receives 11 live supplement dossiers and one unavailable Lemonade dossier. It preserves the pre-existing Barber’s Blend history, raw sources and revision-scoped evidence. The supplement extension is optional so historical submissions retain their original structure. The generated shared release supplies Cassius, Product Studio and existing consumers of the Cassius corpus. Product Studio exposes exact label rows, serving basis, other ingredients, warnings, source dates and conflicts. All scientific/ingredient enrichment remains separate and empty in these submissions.

Canonical data: `knowledge/ggc/product-brain/store.json` (immutable submissions and raw text), `release.json` (generated shared projection, raw evidence excluded from browser imports), `audits/2026-09-06/` (raw HTML, product responses, images, membership records, retrieval metadata, image transcripts and integrity manifest).

Safeguards bind names, amounts and Daily Values to the same exact source row; ingredient amounts must agree with their label row; unknowns cannot become values without evidence; servings cannot be silently converted; website claims are not advertising approvals; ambiguous Hydros asks for flavor; missing Lemonade never borrows a formula. These validate records and retrieval; they do not guarantee error-free generated language.

## Per-product records

### HYDROS— Advanced Hydration Powder (Peach Mango)

[First-party page](https://groomedgentco.com/products/hydration-powder-peach-mango) · retrieved 2026-09-06T13:22:24.270512+00:00

**Serving size:** 1 scoop (5.4 g) · **Servings per container:** 30

| Exact label row | Amount and Daily Value as displayed |
|---|---|
| Calories | 10 kcal |
| Total Carbohydrates | 2 g — <1% DV |
| Thiamin (as Thiamine HCl) | 0.40 mg — 33% DV |
| Riboflavin (Vitamin B2) | 0.43 mg — 33% DV |
| Niacin (Vitamin B3) | 5.20 mg NE — 33% DV |
| Vitamin B6 (as Pyridoxine HCl) | 0.56 mg — 33% DV |
| Folate | 133 mcg DFE (78 mcg Folic Acid) — 33% DV |
| Vitamin B12 (as Methylcobalamin) | 0.80 mcg — 33% DV |
| Pantothenic acid (as D-Calcium Pantothenate) | 1.66 mg — 33% DV |
| Calcium (as Calcium Citrate) | 40 mg — 3% DV |
| Magnesium (as Magnesium Citrate) | 20 mg — 5% DV |
| Sodium (as Sodium Citrate) | 100 mg — 4% DV |
| Potassium (as Potassium Citrate) | 200 mg — 4% DV |

Other Ingredients: Polydextrose, Citric acid, N&A Flavors, Sucralose, Calcium Silicate, Beet Juice Powder (for color).

** Percent Daily Value (DV) is based on a 2,000 calorie diet.

**Directions (stored product description):** Suggested use: Measuring with the scooper located inside the jar, mix each scoop, to desired taste, with 14-20 ounces (414-591 ml) of water (2 scoops with 28-40 ounces (828 ml-1.2 1) of water).

**Page protocol note:** No separate protocol note captured; full page timing guidance is preserved in websiteClaims.

**Warnings/cautions:** Warning: Recommended to not exceed more than 5 scoops within a 24 hour period. Not intended for use by persons with a medical condition. Consult your physician before using this product if you are pregnant of nursing or taking any medication.
This product is intended to supplement a balanced diet and active lifestyle. Consult with a healthcare professional before starting any new dietary supplement, especially if you are pregnant, nursing, have any medical conditions, or are taking any medications.

**Facility allergens:** Manufactured in a facility that produces Milk, Eggs, Fish, Shellfish, Tree Nuts, Peanuts, Wheat, Soybeans, and Sesame.

**Storage:** Store in a cool dry place, keep out of reach of children. Do not use if safety seal is broken or missing. Contents sold by weight not volume, some settling may occur. Secure lid tightly when not in use. Consume within 90 days.

**Sizes/weight:** Product amount: 5.71 oz / 0.36 lb / 162 g
Gross weight (oz/lbs/g): 7.2 oz / 0.45 lbs / 204 g

**Page price:** $39.99

**Product variants:** `[{"id": 47905673216226, "title": "Default Title", "option1": "Default Title", "option2": null, "option3": null, "sku": "OSM0HYMA", "requires_shipping": true, "taxable": true, "featured_image": null, "available": true, "name": "HYDROS— Advanced Hydration Powder (Peach Mango)", "public_title": null, "options": ["Default Title"], "price": 3999, "weight": 204, "compare_at_price": null, "inventory_management": null, "barcode": null, "quantity_rule": {"min": 1, "max": null, "increment": 1}, "quantity_price_breaks": [], "requires_selling_plan": false, "selling_plan_allocations": []}]`

**Positioning (exact page copy):** A clean daily hydration formula built with essential electrolytes and B vitamins to support fluid balance, energy metabolism, muscle function, and training readiness — without caffeine and without a heavy sugar profile.*

**Issues/unknowns:**
- Page Other Ingredients says Beet Juice Powder; Supplement Facts image says Beta Carotene; stored product description says Fruit & Vegetable Blend. Do not select a color ingredient without confirmation.
- Page B6 is Pyridoxine HCl; stored description says Pyridoxal 5 Phosphate. Pantothenic acid is present in the page panel but omitted from the stored ingredients list.
- Hero image is shared with Golden Lychee and depicts Golden Lychee, despite this being Peach Mango.
- Formula revision, individual inactive ingredient amounts and suppliers are not supplied.

### Hydros — Advanced Hydration Powder (Golden Lychee)

[First-party page](https://groomedgentco.com/products/hydration-powder-lychee) · retrieved 2026-09-06T13:22:24.118639+00:00

**Serving size:** 1 scoop (5.4 g) · **Servings per container:** 30

| Exact label row | Amount and Daily Value as displayed |
|---|---|
| Calories | 10 kcal |
| Total Carbohydrates | 2 g — <1% DV |
| Thiamin (as Thiamine HCl) | 0.40 mg — 33% DV |
| Riboflavin (Vitamin B2) | 0.43 mg — 33% DV |
| Niacin (Vitamin B3) | 5.20 mg NE — 33% DV |
| Vitamin B6 (as Pyridoxine HCl) | 0.56 mg — 33% DV |
| Folate | 133 mcg DFE (78 mcg Folic Acid) — 33% DV |
| Vitamin B12 (as Methylcobalamin) | 0.80 mcg — 33% DV |
| Pantothenic acid (as D-Calcium Pantothenate) | 1.66 mg — 33% DV |
| Calcium (as Calcium Citrate) | 40 mg — 3% DV |
| Magnesium (as Magnesium Citrate) | 20 mg — 5% DV |
| Sodium (as Sodium Citrate) | 100 mg — 4% DV |
| Potassium (as Potassium Citrate) | 200 mg — 4% DV |

Other Ingredients: Polydextrose, Citric acid, N&A Flavors, Sucralose, Calcium Silicate, Beet Juice Powder (for color).

** Percent Daily Value (DV) is based on a 2,000 calorie diet.

**Directions (stored product description):** Suggested use: Measuring with the scooper located inside the jar, mix each scoop, to desired taste, with 14-20 ounces (414-591 ml) of water (2 scoops with 28-40 ounces (828 ml-1.2 1) of water).

**Page protocol note:** No separate protocol note captured; full page timing guidance is preserved in websiteClaims.

**Warnings/cautions:** Warning: Recommended to not exceed more than 5 scoops within a 24 hour period. Not intended for use by persons with a medical condition. Consult your physician before using this product if you are pregnant of nursing or taking any medication.
This product is intended to supplement a balanced diet and active lifestyle. Consult with a healthcare professional before starting any new dietary supplement, especially if you are pregnant, nursing, have any medical conditions, or are taking any medications.

**Facility allergens:** Manufactured in a facility that produces Milk, Eggs, Fish, Shellfish, Tree Nuts, Peanuts, Wheat, Soybeans, and Sesame.

**Storage:** Store in a cool dry place, keep out of reach of children. Do not use if safety seal is broken or missing. Contents sold by weight not volume, some settling may occur. Secure lid tightly when not in use. Consume within 90 days.

**Sizes/weight:** Product amount: 5.71 oz / 0.36 lb / 162 g
Gross weight (oz/lbs/g): 7.2 oz / 0.45 lbs / 204 g

**Page price:** $39.99

**Product variants:** `[{"id": 47905671413986, "title": "Default Title", "option1": "Default Title", "option2": null, "option3": null, "sku": "OSM0HYLY", "requires_shipping": true, "taxable": true, "featured_image": null, "available": true, "name": "Hydros — Advanced Hydration Powder (Golden Lychee)", "public_title": null, "options": ["Default Title"], "price": 3999, "weight": 204, "compare_at_price": null, "inventory_management": null, "barcode": null, "quantity_rule": {"min": 1, "max": null, "increment": 1}, "quantity_price_breaks": [], "requires_selling_plan": false, "selling_plan_allocations": []}]`

**Positioning (exact page copy):** A clean daily hydration formula built with essential electrolytes and B vitamins to support fluid balance, energy metabolism, muscle function, and training readiness — without caffeine and without a heavy sugar profile.*

**Issues/unknowns:**
- Page Other Ingredients says Beet Juice Powder; stored description says Fruit & Vegetable Blend.
- Page B6 is Pyridoxine HCl; stored description says Pyridoxal 5 Phosphate. Pantothenic acid is present in the page panel but omitted from the stored ingredients list.
- Formula revision, individual inactive ingredient amounts and suppliers are not supplied.

### HYDROS— Advanced Hydration Powder (Passion Fruit)

[First-party page](https://groomedgentco.com/products/hydration-powder-passion-fruit) · retrieved 2026-09-06T13:22:24.202436+00:00

**Serving size:** 1 scoop (5.4 g) · **Servings per container:** 30

| Exact label row | Amount and Daily Value as displayed |
|---|---|
| Calories | 10 kcal |
| Total Carbohydrates | 2 g — <1% DV |
| Thiamin (as Thiamine HCl) | 0.40 mg — 33% DV |
| Riboflavin (Vitamin B2) | 0.43 mg — 33% DV |
| Niacin (Vitamin B3) | 5.20 mg NE — 33% DV |
| Vitamin B6 (as Pyridoxine HCl) | 0.56 mg — 33% DV |
| Folate | 133 mcg DFE (78 mcg Folic Acid) — 33% DV |
| Vitamin B12 (as Methylcobalamin) | 0.80 mcg — 33% DV |
| Pantothenic acid (as D-Calcium Pantothenate) | 1.66 mg — 33% DV |
| Calcium (as Calcium Citrate) | 40 mg — 3% DV |
| Magnesium (as Magnesium Citrate) | 20 mg — 5% DV |
| Sodium (as Sodium Citrate) | 100 mg — 4% DV |
| Potassium (as Potassium Citrate) | 200 mg — 4% DV |

Other Ingredients: Polydextrose, Citric acid, N&A Flavors, Sucralose, Calcium Silicate, Beet Juice Powder (for color).

** Percent Daily Value (DV) is based on a 2,000 calorie diet.

**Directions (stored product description):** Suggested use: Measuring with the scooper located inside the jar, mix each scoop, to desired taste, with 14-20 ounces (414-591 ml) of water (2 scoops with 28-40 ounces (828 ml-1.2 1) of water).

**Page protocol note:** No separate protocol note captured; full page timing guidance is preserved in websiteClaims.

**Warnings/cautions:** Warning: Recommended to not exceed more than 5 scoops within a 24 hour period. Not intended for use by persons with a medical condition. Consult your physician before using this product if you are pregnant of nursing or taking any medication.
This product is intended to supplement a balanced diet and active lifestyle. Consult with a healthcare professional before starting any new dietary supplement, especially if you are pregnant, nursing, have any medical conditions, or are taking any medications.

**Facility allergens:** Manufactured in a facility that produces Milk, Eggs, Fish, Shellfish, Tree Nuts, Peanuts, Wheat, Soybeans, and Sesame.

**Storage:** Store in a cool dry place, keep out of reach of children. Do not use if safety seal is broken or missing. Contents sold by weight not volume, some settling may occur. Secure lid tightly when not in use. Consume within 90 days.

**Sizes/weight:** Product amount: 5.71 oz / 0.36 lb / 162 g
Gross weight (oz/lbs/g): 7.2 oz / 0.45 lbs / 204 g

**Page price:** $39.99

**Product variants:** `[{"id": 47905674133730, "title": "Default Title", "option1": "Default Title", "option2": null, "option3": null, "sku": "OSM0PASS", "requires_shipping": true, "taxable": true, "featured_image": null, "available": true, "name": "HYDROS— Advanced Hydration Powder (Passion Fruit)", "public_title": null, "options": ["Default Title"], "price": 3999, "weight": 204, "compare_at_price": null, "inventory_management": null, "barcode": null, "quantity_rule": {"min": 1, "max": null, "increment": 1}, "quantity_price_breaks": [], "requires_selling_plan": false, "selling_plan_allocations": []}]`

**Positioning (exact page copy):** A clean daily hydration formula built with essential electrolytes and B vitamins to support fluid balance, energy metabolism, muscle function, and training readiness — without caffeine and without a heavy sugar profile.*

**Issues/unknowns:**
- Page Other Ingredients says Beet Juice Powder; stored description says Fruit & Vegetable Blend.
- Page B6 is Pyridoxine HCl; stored description says Pyridoxal 5 Phosphate. Pantothenic acid is present in the page panel but omitted from the stored ingredients list.
- Hero image depicts Golden Lychee. The label image lists Beta Carotene, while the HTML table lists Beet Juice Powder.
- Formula revision, individual inactive ingredient amounts and suppliers are not supplied.

### Vitalis NMN — Cellular Energy Formula

[First-party page](https://groomedgentco.com/products/nmn) · retrieved 2026-09-06T13:22:24.698574+00:00

**Serving size:** 1 Capsule · **Servings per container:** 30

| Exact label row | Amount and Daily Value as displayed |
|---|---|
| β-Nicotinamide Mononucleotide | 500 mg † |

Other Ingredients: HPMC vegetable capsule, Microcrystalline Cellulose, Silicon Dioxide, Magnesium Stearate.

† Daily Value not established.

**Directions (stored product description):** Suggested use: As a dietary supplement, adults take one (1) capsule daily. For best results, take with 6-8 oz (177-237ml) of water or as directed by healthcare professional.

**Page protocol note:** Take 1 capsule daily. Use as part of a consistent healthy-aging and cellular-energy support routine. Consult a healthcare professional before use if pregnant, nursing, taking medication, managing a medical condition, or preparing for surgery.

**Warnings/cautions:** CAUTION: Do not exceed recommended dose. Consult a physician if pregnant, nursing, under 18, or have a medical condition.
KEEP OUT OF REACH OF CHILDREN. DO NOT USE IF SAFETY SEAL IS DAMAGED OR MISSING. STORE IN A COOL, DRY PLACE.
Vitalis contains 500 mg β-Nicotinamide Mononucleotide per serving. NMN is used as a precursor to support NAD+ production and cellular energy metabolism. Human research is still developing, so this product should be part of a disciplined wellness routine, not positioned as a treatment, cure, or guarantee of anti-aging results. Consult a healthcare professional before use if pregnant, nursing, taking medication, managing a medical condition, or preparing for surgery.

**Facility allergens:** Not disclosed in captured product text; no absence or safety inference.

**Storage:** KEEP OUT OF REACH OF CHILDREN. DO NOT USE IF SAFETY SEAL IS DAMAGED OR MISSING. STORE IN A COOL, DRY PLACE.

**Sizes/weight:** Product amount (oz/lb/g): 30 capsules / 1.3oz / 0.08 lb / 36 g
Gross weight (oz/lb/g): 1.6 oz / 0.1 lb / 45 g

**Page price:** $49.99

**Product variants:** `[{"id": 47905671348450, "title": "Default Title", "option1": "Default Title", "option2": null, "option3": null, "sku": "JTP55NMNC", "requires_shipping": true, "taxable": true, "featured_image": null, "available": true, "name": "Vitalis NMN — Cellular Energy Formula", "public_title": null, "options": ["Default Title"], "price": 4999, "weight": 45, "compare_at_price": null, "inventory_management": null, "barcode": null, "quantity_rule": {"min": 1, "max": null, "increment": 1}, "quantity_price_breaks": [], "requires_selling_plan": false, "selling_plan_allocations": []}]`

**Positioning (exact page copy):** A daily NMN formula built with 500 mg β-Nicotinamide Mononucleotide to support NAD+ production, cellular energy metabolism, and the longevity-focused routine you repeat.*

**Issues/unknowns:**
- Formula revision, individual inactive ingredient amounts and suppliers are not supplied.

### GENESIS — Gut Health & Microbiome Formula

[First-party page](https://groomedgentco.com/products/gut-health) · retrieved 2026-09-06T13:22:23.771082+00:00

**Serving size:** 2 Capsules · **Servings per container:** 30

| Exact label row | Amount and Daily Value as displayed |
|---|---|
| Organic Apple Cider Vinegar Powder (fruit) | 1,000 mg † |
| Inulin (Helianthus tuberosus) Jerusalem artichoke root | 200 mg † |
| DigeZyme® | 100 mg † |
| Lactobacillus acidophilus LA85 | 10 mg / 1 Billion CFU ‡ |

Other Ingredients: HPMC vegetable capsule, Brown Rice Flour, Magnesium Stearate, Olive Oil, Silicon Dioxide.

† Daily Value not established.
‡ 1 Billion Live Colony Forming Units (CFU) at the time of manufacture.
** Daily Value (DV) not established.

**Directions (stored product description):** Suggested use: As a dietary supplement, adults take two (2) capsules daily. For best results, take with 6-8 oz (177-236ml) of water or as directed by a healthcare professional.

**Page protocol note:** Take 2 capsules daily. Use as part of a consistent digestive support routine. If you are immunocompromised, seriously ill, pregnant, nursing, taking medication, or managing a medical condition, consult a healthcare professional before use.

**Warnings/cautions:** Warning: Do not exceed recommended dose. Pregnant or nursing mothers, children under the age of 18, and individuals with a known medical condition should consult a physician before using this or any dietary supplement.
Genesis contains apple cider vinegar powder, prebiotic inulin, DigeZyme®, and Lactobacillus acidophilus LA85. Probiotic products may not be appropriate for everyone. Consult a healthcare professional before use if you are immunocompromised, seriously ill, pregnant, nursing, taking medication, managing a medical condition, or preparing for surgery.

**Facility allergens:** Not disclosed in captured product text; no absence or safety inference.

**Storage:** Unknown

**Sizes/weight:** Product amount: 60 capsules
Net weight (oz/lb/g): 2.7oz / 0.17lb / 76g
Gross weight (oz/lbs/g): 2.56 oz / 0.16 lbs / 73 g

**Page price:** $39.99

**Product variants:** `[{"id": 47905671708898, "title": "Default Title", "option1": "Default Title", "option2": null, "option3": null, "sku": "JTP4GUTH", "requires_shipping": true, "taxable": true, "featured_image": null, "available": true, "name": "GENESIS — Gut Health & Microbiome Formula", "public_title": null, "options": ["Default Title"], "price": 3999, "weight": 73, "compare_at_price": null, "inventory_management": null, "barcode": null, "quantity_rule": {"min": 1, "max": null, "increment": 1}, "quantity_price_breaks": [], "requires_selling_plan": false, "selling_plan_allocations": []}]`

**Positioning (exact page copy):** A daily gut health formula built with organic apple cider vinegar powder, prebiotic inulin, DigeZyme®, and Lactobacillus acidophilus LA85 to support digestive health, nutrient breakdown, beneficial bacteria, and daily gut rhythm.*

**Issues/unknowns:**
- Stored description suggests 1–2 servings daily; page protocol and Suggested use specify 2 capsules daily. Confirm maximum daily use.
- Stored net weight is 76 g but gross weight is 73 g. Confirm packaging weights.
- Probiotic potency is 1 Billion CFU at manufacture, not a shelf-life guarantee. DigeZyme enzyme composition/activity units and shelf-life CFU are not disclosed.
- Formula revision, individual inactive ingredient amounts and suppliers are not supplied.

### RESTORIA — Magnesium Glycinate

[First-party page](https://groomedgentco.com/products/magnesium-glycinate) · retrieved 2026-09-06T13:22:24.494916+00:00

**Serving size:** 3 capsules · **Servings per container:** 30

| Exact label row | Amount and Daily Value as displayed |
|---|---|
| Magnesium (from 2,500 mg Magnesium Glycinate) | 275 mg — 65% DV |

Other Ingredients: Hypromellose (capsule), Magnesium Stearate, Silicon Dioxide, Rice Flour.

* Percent Daily Values (DV) are based on a 2,000 calorie diet.

**Directions (stored product description):** Suggested Use: As a dietary supplement, take three (3) capsules once daily or as directed by your healthcare professional.

**Page protocol note:** Take 3 capsules daily. Use as part of your evening restoration routine.

**Warnings/cautions:** Caution: Do not exceed recommended dose. Pregnant or nursing mothers, children under the age of 18, and individuals with a known medical condition should consult a physician before using this or any dietary supplement.
Warning: Keep out of reach of children. Do not use if the safety seal is damaged or missing. Store in a cool, dry place.

**Facility allergens:** Not disclosed in captured product text; no absence or safety inference.

**Storage:** Warning: Keep out of reach of children. Do not use if the safety seal is damaged or missing. Store in a cool, dry place.

**Sizes/weight:** Amount: 90 capsules
Gross Weight: 4oz / 0.25lb / 113g

**Page price:** $34.99

**Product variants:** `[{"id": 47905672757474, "title": "Default Title", "option1": "Default Title", "option2": null, "option3": null, "sku": "VOX4MGNE", "requires_shipping": true, "taxable": true, "featured_image": null, "available": true, "name": "RESTORIA — Magnesium Glycinate", "public_title": null, "options": ["Default Title"], "price": 3499, "weight": 113, "compare_at_price": null, "inventory_management": null, "barcode": null, "quantity_rule": {"min": 1, "max": null, "increment": 1}, "quantity_price_breaks": [], "requires_selling_plan": false, "selling_plan_allocations": []}]`

**Positioning (exact page copy):** A daily magnesium glycinate protocol built to support relaxation, muscle function, nervous system function, and recovery rhythm as part of your evening routine.*

**Issues/unknowns:**
- Page and label: 275 mg magnesium from 2,500 mg magnesium glycinate per 3 capsules. Stored description says each capsule provides those amounts. Do not calculate a per-capsule or daily dose from the conflicting copy.
- Formula revision, individual inactive ingredient amounts and suppliers are not supplied.

### NOCTURNE — Sleep Support Formula

[First-party page](https://groomedgentco.com/products/sleep-support) · retrieved 2026-09-06T13:22:24.971042+00:00

**Serving size:** 2 Capsules · **Servings per container:** 30

| Exact label row | Amount and Daily Value as displayed |
|---|---|
| Vitamin B6 (Pyridoxine HCl) | 1.8 mg - 106% DV |
| Calcium (as Calcium Carbonate) | 17 mg - 1% DV |
| Magnesium (as Magnesium Citrate) | 13 mg - 3% DV |
| Melatonin | 10 mg |
| Sleep Formula Proprietary Blend | 905 mg |

Other Ingredients: Hypromellose (vegetable capsule), Magnesium Stearate (vegetable), Silicon Dioxide.

**Daily Value not established.

Sleep Formula Proprietary Blend includes: L-Tryptophan, Lycium (Lycium barbarum L.) fruit, Chamomile (Matricaria chamomilla L.) flower, Lemon Balm (Melissa officinalis) aerial, Passion Flower (Passiflora incarnata) flower, L-Taurine, Hops (Humulus lupulus) flower, St. John's Wort (Hypericum perforatum) aerial, Gamma-Aminobutyric Acid (GABA), Chinese Skullcap (Scutellaria baicalensis) root, L-Theanine, Ashwagandha (Withania somnifera) root, Inositol, 5-HTP (Griffonia simplicifolia) seed.

Individual blend-member quantities: unknown.

**Directions (stored product description):** Suggested use: As a dietary supplement, take two (2) capsules once a day. For best results, take 20-30 min before bedtime with an 8oz (237ml) glass of water or as directed by your healthcare professional.

**Page protocol note:** Take 2 capsules as part of your evening routine. Do not combine with alcohol, sedatives, antidepressants, or other serotonin-affecting products unless directed by a healthcare professional.

**Warnings/cautions:** Warning: Do not exceed recommended dose. Pregnant or nursing mothers, children under the age of 18, and individuals with a known medical condition should consult a physician before using this or any dietary supplement.
Nocturne contains melatonin, St. John's Wort, 5-HTP, L-tryptophan, GABA, botanicals, and amino acids. Do not use with antidepressants, SSRIs, MAOIs, sedatives, alcohol, or other serotonin-affecting products unless directed by a healthcare professional. Consult a healthcare professional before use if pregnant, nursing, taking medication, managing a medical condition, or preparing for surgery.

**Facility allergens:** Not disclosed in captured product text; no absence or safety inference.

**Storage:** Unknown

**Sizes/weight:** Product amount: 60 capsules
Gross weight (oz/lbs/g): 2.4 oz / 0.15 lbs / 68 g

**Page price:** $34.99

**Product variants:** `[{"id": 47905673674978, "title": "Default Title", "option1": "Default Title", "option2": null, "option3": null, "sku": "VOX4SLFR", "requires_shipping": true, "taxable": true, "featured_image": null, "available": true, "name": "NOCTURNE — Sleep Support Formula", "public_title": null, "options": ["Default Title"], "price": 3499, "weight": 68, "compare_at_price": null, "inventory_management": null, "barcode": null, "quantity_rule": {"min": 1, "max": null, "increment": 1}, "quantity_price_breaks": [], "requires_selling_plan": false, "selling_plan_allocations": []}]`

**Positioning (exact page copy):** A disciplined evening formula built with melatonin, amino acids, minerals, and calming botanicals to support sleep readiness, relaxation, and the nightly restoration rhythm you repeat.*

**Issues/unknowns:**
- 905 mg is the total proprietary blend. Individual amounts for its 14 members are not disclosed and must stay unknown.
- Collection timing is 30–60 minutes before bed; stored Suggested use is 20–30 minutes. Preserve both and confirm current directions.
- Formula revision, individual inactive ingredient amounts and suppliers are not supplied.
- Individual amounts for all 14 proprietary-blend members.

### SOLARIS — Male Vitality Formula

[First-party page](https://groomedgentco.com/products/ashwagandha-plus) · retrieved 2026-09-06T13:22:23.327369+00:00

**Serving size:** 2 Capsules · **Servings per container:** 30

| Exact label row | Amount and Daily Value as displayed |
|---|---|
| Vitamin D3 (as Cholecalciferol) | 20 mcg — 100% DV |
| Vitamin B6 (as Pyridoxine Hydrochloride) | 2.5 mg — 147% DV |
| Vitamin B12 (as Methylcobalamin 1%) | 25 mcg — 1,042% DV |
| KSM-66® Ashwagandha Extract (standardized to 5% Withanolides) | 600 mg |
| L-Arginine | 300 mg |
| Maca Root Powder (Lepidium meyenii) root | 150 mg |
| Panax Ginseng Powder root | 100 mg |
| Shatavari Powder (Asparagus racemosus) root | 50 mg |

Other Ingredients: HPMC vegetable capsule.

* Percent Daily Values (DV) are based on a 2,000 calorie diet. † Daily Value not established.

**Directions (stored product description):** Suggested use: As a dietary supplement, adults take two (2) capsules daily. For best results, take with 6-8 oz (177-237ml) of water or as directed by healthcare professional.

**Page protocol note:** Take 2 capsules daily. Use as part of a consistent daily vitality routine. Consult a healthcare professional before use if taking medication, managing a medical condition, pregnant, nursing, or preparing for surgery.

**Warnings/cautions:** Warning: Do not exceed recommended dose. Pregnant or nursing mothers, children under the age of 18, and individuals with known medical conditions should consult a physician before using this or any dietary supplement. KEEP OUT OF THE REACH OF CHILDREN. DO NOT USE IF SAFETY SEAL IS DAMAGED OR MISSING. STORE IN A COOL, DRY PLACE.
Solaris contains KSM-66® Ashwagandha, Panax Ginseng, Maca, Shatavari, L-Arginine, Vitamin D3, B6, and B12. Consult a healthcare professional before use if you are taking medication, managing a medical condition, pregnant, nursing, or preparing for surgery. Do not use if you have been advised to avoid ashwagandha, ginseng, or arginine-containing products.

**Facility allergens:** Not disclosed in captured product text; no absence or safety inference.

**Storage:** Warning: Do not exceed recommended dose. Pregnant or nursing mothers, children under the age of 18, and individuals with known medical conditions should consult a physician before using this or any dietary supplement. KEEP OUT OF THE REACH OF CHILDREN. DO NOT USE IF SAFETY SEAL IS DAMAGED OR MISSING. STORE IN A COOL, DRY PLACE.

**Sizes/weight:** Product amount: 60 capsules / 1.6 oz / 0.1 lbs / 44 g
Gross weight (oz/lbs/g): 2.56 oz / 0.16 lbs / 73 g

**Page price:** $39.99

**Product variants:** `[{"id": 47905673904354, "title": "Default Title", "option1": "Default Title", "option2": null, "option3": null, "sku": "JTP4APLU", "requires_shipping": true, "taxable": true, "featured_image": null, "available": true, "name": "SOLARIS — Male Vitality Formula", "public_title": null, "options": ["Default Title"], "price": 3999, "weight": 73, "compare_at_price": null, "inventory_management": null, "barcode": null, "quantity_rule": {"min": 1, "max": null, "increment": 1}, "quantity_price_breaks": [], "requires_selling_plan": false, "selling_plan_allocations": []}]`

**Positioning (exact page copy):** A daily male vitality formula built with KSM-66® Ashwagandha, Maca, L-Arginine, Panax Ginseng, Shatavari, and key vitamins to support resilience, energy metabolism, circulation support, and daily performance readiness.*

**Issues/unknowns:**
- Botanical/amino-acid rows omit DV symbols although the panel includes a Daily Value not established footnote. Preserve this presentation; no numeric DV inferred.
- Formula revision, individual inactive ingredient amounts and suppliers are not supplied.

### ASCEND — Cognitive Performance Formula(Sour Candy)

[First-party page](https://groomedgentco.com/products/focus-powder-sour-candy) · retrieved 2026-09-06T13:22:23.821532+00:00

**Serving size:** 2 Scoops (8 g) · **Servings per container:** 20

| Exact label row | Amount and Daily Value as displayed |
|---|---|
| Calories | 10 kcal |
| Total Carbohydrates | 2 g — <1% DV |
| Thiamin (as Thiamine HCl) | 0.40 mg — 33% DV |
| Riboflavin (Vitamin B2) | 0.43 mg — 33% DV |
| Niacin (Vitamin B3) | 5.20 mg NE — 33% DV |
| Vitamin B6 (as Pyridoxine HCl) | 0.56 mg — 33% DV |
| Folate (as Folic Acid) | 133 mcg DFE — 33% DV |
| Vitamin B12 (as Methylcobalamin) | 0.80 mcg — 33% DV |
| Pantothenic Acid (as D-Calcium Pantothenate) | 1.66 mg — 33% DV |
| L-Arginine HCl | 1,000 mg † |
| Inositol | 600 mg † |
| Alpha GPC | 300 mg † |
| Natural Caffeine (from Green Tea) | 200 mg † |
| L-Theanine | 100 mg † |
| Asian Ginseng Extract | 50 mg † |
| Black Pepper Extract | 5 mg † |

Citric Acid, Polydextrose, Natural & Artificial Flavor, Sucralose, Calcium Silicate, Vegetable Juice Powder (for color).

** Percent Daily Values (DV) are based on a 2,000 calorie diet. † Daily Value not established.

**Directions (stored product description):** Suggested use: Mix 2 scoops (8 g) with 16 fl oz (480 mL) of water or adjust to taste.

**Page protocol note:** Contains 200 mg caffeine per serving. Use earlier in the day or before a focused output window. Avoid use within 6–8 hours of bedtime. Do not combine with other caffeine or stimulant products.

**Warnings/cautions:** Warning: Do not exceed more than 5 scoops within a 24-hour period. Not intended for use by individuals with a medical condition. Consult your physician before using this product if you are pregnant, nursing, or taking any medication.
This product is intended to supplement a balanced diet and active lifestyle. Consult a healthcare professional before starting any new dietary supplement, especially if you are pregnant, nursing, have a medical condition, or are taking any medications.
Ascend contains 200 mg caffeine per serving from green tea, plus Alpha GPC, L-theanine, Asian ginseng, L-arginine, inositol, B vitamins, and black pepper extract. Do not combine with other caffeine or stimulant products. Avoid use within 6–8 hours of bedtime. Consult a healthcare professional before use if pregnant, nursing, caffeine-sensitive, taking medication, managing a medical condition, or preparing for surgery.

**Facility allergens:** Manufactured in a facility that processes milk, eggs, fish, shellfish, tree nuts, peanuts, wheat, soybeans, and sesame.

**Storage:** Store in a cool, dry place. Keep out of reach of children. Do not use if the safety seal is broken or missing. Contents are sold by weight, not volume; some settling may occur. Secure lid tightly when not in use. Consume within 90 days.

**Sizes/weight:** Product amount (oz/lbs/g): 5.3 oz / 0.33 lbs / 150 g
Gross weight (oz/lbs/g): 7.2 oz / 0.45 lbs / 204 g

**Page price:** $45.99

**Product variants:** `[{"id": 47905667547362, "title": "Default Title", "option1": "Default Title", "option2": null, "option3": null, "sku": "OSM0SCAN", "requires_shipping": true, "taxable": true, "featured_image": null, "available": true, "name": "ASCEND — Cognitive Performance Formula(Sour Candy)", "public_title": null, "options": ["Default Title"], "price": 4599, "weight": 204, "compare_at_price": null, "inventory_management": null, "barcode": null, "quantity_rule": {"min": 1, "max": null, "increment": 1}, "quantity_price_breaks": [], "requires_selling_plan": false, "selling_plan_allocations": []}]`

**Positioning (exact page copy):** A focus-forward nootropic powder built with natural caffeine, L-theanine, Alpha GPC, B vitamins, L-arginine, inositol, Asian ginseng, and black pepper extract to support alertness, mental clarity, energy metabolism, and productive output.*

**Issues/unknowns:**
- Panel says 20 servings of 8 g, while stored net amount is 150 g. The implied 160 g is an audit calculation, not a replacement net weight. Confirm fill weight/servings.
- Inactive ingredients appear in the stored product description, but are omitted from the page Supplement Facts panel and label image.
- Formula revision, individual inactive ingredient amounts and suppliers are not supplied.

### NAD+

[First-party page](https://groomedgentco.com/products/nad) · retrieved 2026-09-06T13:22:24.623210+00:00

**Serving size:** 2 Capsules · **Servings per container:** 30

| Exact label row | Amount and Daily Value as displayed |
|---|---|
| NAD+ (Nicotinamide Adenine Dinucleotide) | 500 mg † |
| Quercetin Dihydrate Extract (Sophora japonica) whole flower bud | 250 mg † |
| Japanese Knotweed Extract (Polygonum cuspidatum) root, 98% resveratrol | 150 mg † |

Other Ingredients: HPMC vegetable capsule, MCC microcrystalline cellulose, Brown Rice Flour, Olive Oil, Silicon Dioxide, Magnesium Stearate.

† Daily Value not established.

**Directions (stored product description):** Suggested use: As a dietary supplement, adults take two (2) capsules daily. For best results, take with 6oz (177ml) of water or as directed by healthcare professional.

**Page protocol note:** Take 2 capsules daily. Use as part of a consistent cellular-energy and healthy-aging support routine. Consult a healthcare professional before use if pregnant, nursing, taking medication, managing a medical condition, or preparing for surgery.

**Warnings/cautions:** Warning: Do not exceed recommended dose. Pregnant or nursing mothers, children under the age of 18, and individuals with known medical conditions should consult a physician before using this or any dietary supplement. KEEP OUT OF THE REACH OF CHILDREN. DO NOT USE IF SAFETY SEAL IS DAMAGED OR MISSING. STORE IN A COOL, DRY PLACE.
Nexus contains NAD+, Quercetin Dihydrate Extract, and Japanese Knotweed Extract standardized to 98% resveratrol. Human research on NAD+ supplementation and longevity-support outcomes is still developing, so this product should be part of a disciplined wellness routine, not positioned as a treatment, cure, or anti-aging guarantee. Consult a healthcare professional before use if pregnant, nursing, taking medication, managing a medical condition, or preparing for surgery. Use caution if taking blood-thinning medications or medications that may interact with polyphenol supplements.

**Facility allergens:** Not disclosed in captured product text; no absence or safety inference.

**Storage:** Warning: Do not exceed recommended dose. Pregnant or nursing mothers, children under the age of 18, and individuals with known medical conditions should consult a physician before using this or any dietary supplement. KEEP OUT OF THE REACH OF CHILDREN. DO NOT USE IF SAFETY SEAL IS DAMAGED OR MISSING. STORE IN A COOL, DRY PLACE.

**Sizes/weight:** Product amount: 60 capsules / 1.8 oz / 0.11 lb / 50 g
Gross weight (oz/lbs/g): 2.4 oz / 0.15 lbs / 68 g

**Page price:** $60.00

**Product variants:** `[{"id": 47905532543202, "title": "Default Title", "option1": "Default Title", "option2": null, "option3": null, "sku": "JTP4NADP", "requires_shipping": true, "taxable": true, "featured_image": null, "available": true, "name": "NAD+", "public_title": null, "options": ["Default Title"], "price": 6000, "weight": 68, "compare_at_price": null, "inventory_management": null, "barcode": null, "quantity_rule": {"min": 1, "max": null, "increment": 1}, "quantity_price_breaks": [], "requires_selling_plan": false, "selling_plan_allocations": []}]`

**Positioning (exact page copy):** A daily cellular power formula built with NAD+, Quercetin Dihydrate Extract, and Japanese Knotweed Extract standardized to 98% resveratrol to support cellular energy metabolism, antioxidant defense, and the longevity-focused routine you repeat.*

**Issues/unknowns:**
- Catalog title is NAD+ while page hero and bottle say NEXUS. Preserve both; confirm preferred official name.
- HTML and stored description: Japanese Knotweed Extract standardized to 98% resveratrol; label image: 96% resveratrol. Do not infer milligrams of pure resveratrol.
- Formula revision, individual inactive ingredient amounts and suppliers are not supplied.

### FORTIUS AQUA Creatine + Electrolyte Performance Formula

[First-party page](https://groomedgentco.com/products/creatine-hydration-powder) · retrieved 2026-09-06T13:22:23.354038+00:00

**Serving size:** 1 scoop (10 g) · **Servings per container:** 30

| Exact label row | Amount and Daily Value as displayed |
|---|---|
| Calories | 22 |
| Magnesium as Magnesium Malate | 60 mg |
| Sodium as Sea Salt | 1,000 mg |
| Potassium as Potassium Chloride | 200 mg |
| Creatine as Creatine Monohydrate | 5,000 mg |

Other Ingredients: Natural Flavors, Stevia Extract (Leaf), Silicon Dioxide.

Daily Value footnotes: not shown.

**Directions (stored product description):** Suggested use: As a dietary supplement, adults mix one (1) scoop (10g) with 6-8 oz (177-237ml) of water or favorite beverage daily.

**Page protocol note:** Mix 1 scoop with water. Use daily as part of your training, hydration, and nutrition routine.

**Warnings/cautions:** Warning: Do not exceed recommended dose. Pregnant or nursing mothers, children under the age of 18, and individuals with a known medical condition should consult a physician before using this or any dietary supplement.
KEEP OUT OF THE REACH OF CHILDREN. DO NOT USE IF SAFETY SEAL IS DAMAGED OR MISSING. STORE IN A COOL, DRY PLACE

**Facility allergens:** Not disclosed in captured product text; no absence or safety inference.

**Storage:** KEEP OUT OF THE REACH OF CHILDREN. DO NOT USE IF SAFETY SEAL IS DAMAGED OR MISSING. STORE IN A COOL, DRY PLACE

**Sizes/weight:** Product amount (oz/lbs/g): 10.6 oz / 0.7 lbs / 300 g
Gross weight (oz/lbs/g): 13.6 oz / 0.85 lbs / 386 g

**Page price:** $52.99

**Product variants:** `[{"id": 47905450361058, "title": "Default Title", "option1": "Default Title", "option2": null, "option3": null, "sku": "JTP0CRHY", "requires_shipping": true, "taxable": true, "featured_image": null, "available": true, "name": "FORTIUS AQUA\nCreatine + Electrolyte Performance Formula", "public_title": null, "options": ["Default Title"], "price": 4999, "weight": 386, "compare_at_price": null, "inventory_management": null, "barcode": null, "quantity_rule": {"min": 1, "max": null, "increment": 1}, "quantity_price_breaks": [], "requires_selling_plan": false, "selling_plan_allocations": []}]`

**Positioning (exact page copy):** A performance hydration formula built with 5g creatine monohydrate plus sodium, potassium, and magnesium to support strength output, hydration, cellular energy, and daily training readiness.*

**Issues/unknowns:**
- Page hero price is $52.99; collection and public product data say $49.99. Confirm sellable price.
- Daily Values are not shown in the available Supplement Facts table. Do not calculate them.
- Formula revision, individual inactive ingredient amounts and suppliers are not supplied.
- Percent Daily Values not shown.

