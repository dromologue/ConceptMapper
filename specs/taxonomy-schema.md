# Collins Network Taxonomy Schema

> The canonical reference for converting any intellectual content into a structured network that concept-mapper can parse and visualize.

Give this document to an LLM along with your source material. The LLM should produce a markdown file in the exact format described below. The concept-mapper parser will consume that file and produce an interactive force-directed graph.

---

## Overview

The taxonomy describes intellectual networks as a graph with:
- **Nodes**: Thinkers (people) and Concepts (ideas, frameworks, theories)
- **Edges**: Typed relationships between nodes
- **Metadata**: Generations, streams, external shocks, and structural observations

The file format is standard markdown with fenced code blocks containing key-value pairs.

---

## File Structure

A taxonomy file has this section structure (order matters):

```markdown
# [Network Title]

## Generations
[Markdown table defining generational cohorts]

## Streams
[Markdown table defining intellectual streams with colors]

## Thinker Nodes
[One fenced code block per thinker]

## Concept Nodes
[One fenced code block per concept]

## Edges
### Thinker-to-Thinker
[Fenced blocks with edge definitions]

### Thinker-to-Concept
[Fenced blocks with edge definitions]

### Concept-to-Concept
[Fenced blocks with edge definitions]

## External Shocks
[Fenced blocks with date/description pairs]

## Structural Observations
[Bullet list of network-level observations]
```

---

## Generations Table

Define the generational cohorts that organize thinkers chronologically.

```markdown
## Generations

| Gen | Period | Label | Attention Space Count |
|-----|--------|-------|-----------------------|
| 1 | ~1880–1920 | Founders | 3 |
| 2 | ~1930–1960 | Systematisers | 4 |
| 3 | ~1960–1985 | Flowering | 5 |
```

Fields:
- **Gen**: Integer, sequential from 1
- **Period**: Approximate date range
- **Label**: Descriptive name for the generation
- **Attention Space Count**: Number of distinct active positions (Collins predicts 3–6)

---

## Streams Table

Define the intellectual streams (domains) that organize thinkers thematically.

```markdown
## Streams

| Stream ID | Name | Colour | Description |
|-----------|------|--------|-------------|
| mgmt | Management & Organisation | Blue | How organisations should be designed |
| social | Social Structure & Power | Red | How social structures reproduce themselves |
| systems | Systems & Complexity | Green | How feedback and emergence operate |
| psychology | Psychology & Cognition | Amber | How individuals think and learn |
| sensemaking | Sensemaking & Safety | Purple | How meaning is constructed |
```

Fields:
- **Stream ID**: Short lowercase identifier (used in node definitions)
- **Name**: Full display name
- **Colour**: Display color for visualization
- **Description**: Brief description of the stream's focus

---

## Thinker Nodes

Each thinker is a fenced code block with key-value pairs. One block per thinker.

```
id:               argyris
name:             Chris Argyris
dates:            1923–2013
eminence:         dominant
generation:       2
stream:           psychology
structural_role:  intellectual_leader, chain_originator
active_period:    1960–1995
key_concept_ids:  [double_loop, defensive_routines, espoused_vs_inuse]
institutional_base: Harvard Business School
notes:            Optional free text
```

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique lowercase identifier (e.g., `argyris`, `senge`) |
| `name` | string | Full display name |
| `eminence` | enum | `dominant`, `major`, `secondary`, or `minor` |
| `generation` | integer | Generational cohort number (matches Generations table) |
| `stream` | string | Stream ID (matches Streams table) |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `dates` | string | Birth–death or "b. YYYY" for living thinkers |
| `structural_role` | list | Comma-separated roles (see Structural Roles below) |
| `active_period` | string | Approximate years of peak influence |
| `key_concept_ids` | list | Bracket-delimited concept IDs: `[id1, id2, id3]` |
| `institutional_base` | string | Primary organisational affiliation |
| `notes` | string | Free text annotation |

### Eminence Tiers

| Tier | Definition | Diagnostic |
|------|-----------|------------|
| **dominant** | Shapes the field across multiple generations; referenced by most other nodes | High upstream AND downstream density; concepts still actively contested |
| **major** | Redirects a stream for at least one generation; produces widely adopted concepts | Moderate-to-high density; at least one concept in active use |
| **secondary** | Notable contribution; refines, extends, or applies ideas from dominant/major nodes | Moderate density; concepts used but rarely contested |
| **minor** | Active participant; known mainly through connection to more eminent nodes | Low density; few independent concepts |

### Structural Roles

| Role | Definition |
|------|-----------|
| `chain_originator` | First node in a lineage; often retrospectively elevated |
| `chain_transmitter` | Passes cultural capital without major transformation |
| `organisational_leader` | Creates institutional conditions for a group |
| `intellectual_leader` | Produces the ideas that define a group or movement |
| `synthesiser` | Integrates previously rival positions into a new framework |
| `structural_rival` | Contemporaneous opponent of comparable stature |
| `twilight_creator` | Last in a chain; produces major work without successors |
| `isolate` | Eminent thinker with few network connections |
| `peripheral_critic` | Outside the main network but producing influential critiques |

---

## Concept Nodes

Each concept is a fenced code block with key-value pairs. One block per concept.

```
id:               double_loop
name:             Double-Loop Learning
originator_id:    argyris
date_introduced:  1977
concept_type:     distinction
abstraction_level: theoretical
status:           active
generation:       3
stream:           psychology
notes:            Optional free text
```

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique lowercase identifier |
| `name` | string | Full display name |
| `concept_type` | enum | `framework`, `principle`, `distinction`, `mechanism`, `prescription`, or `synthesis` |
| `abstraction_level` | enum | `concrete`, `operational`, `theoretical`, or `meta-theoretical` |
| `status` | enum | `active`, `absorbed`, `contested`, `dormant`, or `superseded` |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `originator_id` | string | Thinker ID who first articulated this concept. Omit if unknown. |
| `date_introduced` | string | Year or decade of first publication |
| `generation` | integer | Generation in which it first appeared. Omit for sub-concepts (inherited from parent). |
| `stream` | string | Primary intellectual stream. Omit for sub-concepts (inherited from parent). |
| `parent_concept_id` | string | For sub-concepts: ID of the parent concept (e.g., `cynefin` for Clear/Complicated/Complex domains) |
| `notes` | string | Free text annotation |

### Concept Types

| Type | Definition | Example |
|------|-----------|---------|
| **framework** | A structured model for analysis or action | Cynefin, VSM, OODA |
| **principle** | A general claim about how things work | Local rationality, Requisite variety |
| **distinction** | A named contrast between two or more things | Espoused theory vs theory-in-use |
| **mechanism** | A causal process that explains why something happens | Defensive routines, Drift into failure |
| **prescription** | A recommendation for action | Drive out fear, Bias for action |
| **synthesis** | A concept that combines ideas from multiple sources | Seven conditions for learning |

### Abstraction Levels

| Level | Definition | Example |
|-------|-----------|---------|
| **concrete** | Directly observable practice or tool | Kanban board, Standup meeting |
| **operational** | A method or procedure with defined steps | PDSA cycle, Immunity map |
| **theoretical** | An explanatory model of how a domain works | Structuration theory, Prospect theory |
| **meta-theoretical** | A theory about how theories work or change | Paradigm shift, Abstraction-reflexivity sequence |

### Concept Status

| Status | Definition |
|--------|-----------|
| **active** | Currently in use and debated |
| **absorbed** | Integrated into a later concept; no longer referenced independently |
| **contested** | Subject to active opposition or critique |
| **dormant** | Not currently active but not superseded |
| **superseded** | Replaced by a later concept |

---

## Edges

Edges are defined in fenced code blocks. Multiple edges can appear in one block, separated by blank lines. Each edge starts with `from:`.

### Format

```
from: argyris   to: edmondson  type: teacher_pupil
  note: Edmondson studied under Argyris at Harvard

from: stacey    to: senge      type: rivalry
  note: Core rivalry of the phase. Can you design a learning organisation
        or does learning emerge from complex responsive processes?
```

Each edge has:

| Field | Required | Description |
|-------|----------|-------------|
| `from` | Yes | Source node ID (thinker or concept) |
| `to` | Yes | Target node ID (thinker or concept) |
| `type` | Yes | Edge type (see tables below) |
| `note` | No | Prose description of the relationship. Multi-line notes use indented continuation lines. |
| `weight` | No | Importance weight 0.0–1.0. Defaults to 1.0. Use lower values for inferred or weak connections. |

### Thinker-to-Thinker Edge Types

| Type | Direction | Definition |
|------|-----------|-----------|
| `teacher_pupil` | Directed (elder → younger) | Direct pedagogical relationship |
| `chain` | Directed | Personal contact transmitting cultural capital |
| `rivalry` | Undirected | Contemporaneous opposition on shared questions |
| `alliance` | Undirected | Parallel or complementary work; mutual reinforcement |
| `synthesis` | Directed (sources → synthesiser) | One thinker integrates ideas from two or more others |
| `institutional` | Undirected | Shared organisational affiliation |

### Thinker-to-Concept Edge Types

| Type | Direction | Definition |
|------|-----------|-----------|
| `originates` | Thinker → Concept | The thinker first articulated this concept |
| `develops` | Thinker → Concept | The thinker significantly extended or refined a concept |
| `contests` | Thinker → Concept | The thinker explicitly opposes or critiques this concept |
| `applies` | Thinker → Concept | The thinker uses the concept within their own framework |

### Concept-to-Concept Edge Types

| Type | Direction | Definition |
|------|-----------|-----------|
| `extends` | Directed | Concept B builds directly on Concept A |
| `opposes` | Undirected | Rival answers to the same question |
| `subsumes` | Directed | Concept B absorbs Concept A as a special case |
| `enables` | Directed | Concept A is a precondition for Concept B |
| `reframes` | Directed | Concept B recasts the problem that Concept A addresses |

---

## Rich Content (Optional)

For nodes with detailed descriptions, add content fields. These are displayed in the detail panel but do not affect the graph structure.

Content is specified as additional KV fields in the node block, using a `content_` prefix:

```
id:               dekker
name:             Sidney Dekker
eminence:         major
generation:       4
stream:           sensemaking
content_summary:  Safety scientist who showed that the way we respond to failure determines whether organisations learn from it
content_key_works: [The Field Guide to Understanding Human Error (2006), Just Culture (2007), Drift into Failure (2011)]
content_critiques: [Over-emphasises systemic factors at the expense of individual responsibility, Prescriptions can be vague]
```

| Field | Type | Description |
|-------|------|-------------|
| `content_summary` | string | One-paragraph summary of the thinker or concept |
| `content_key_works` | list | Bibliography entries in bracket-delimited list |
| `content_critiques` | list | Known criticisms or limitations |

---

## External Shocks

Events that altered the institutional base of the network.

```
date: 1950s
description: Quality revolution in Japan; Deming's methods adopted
             outside Western management orthodoxy

date: 2001
description: Agile Manifesto; software industry formalises rejection
             of waterfall methods
```

---

## Structural Observations

Network-level observations as a bullet list.

```markdown
## Structural Observations

- **Attention space**: The network sustains 4–5 active positions per generation
- **Chain depth**: The longest chain runs Taylor → Argyris → Senge → synthesis, spanning four generations
- **Central rivalry**: Stacey vs Senge defines what "organisational learning" means for two generations
- **Abstraction trend**: Rising across the network from concrete (Gen 1) to meta-theoretical (Gen 5)
```

---

## Visual Conventions

The visualization applies these visual rules automatically based on edge type:

| Edge Type | Line Style | Color | Arrow |
|-----------|-----------|-------|-------|
| `chain`, `teacher_pupil` | Solid | Default | Yes (directed) |
| `synthesis` | Solid | Default | Yes (converging) |
| `rivalry` | Dashed | Red | No |
| `alliance` | Dotted | Grey | No |
| `institutional` | Thin dotted | Grey | No |
| `originates`, `develops`, `extends`, `subsumes`, `enables`, `reframes` | Solid | Default | Yes (directed) |
| `contests`, `applies` | Solid | Default | Yes (directed) |
| `opposes` | Dashed | Red | No |

Node appearance:
- **Thinker nodes**: Circles. Size by eminence (dominant = largest). Color by stream.
- **Concept nodes**: Rounded rectangles. Smaller than thinkers. Color by stream.
- **Y-axis**: Generations (earliest at top)
- **X-axis**: Streams (grouped by domain)

---

## Instructions for LLM Extraction

When using an LLM to convert source material to this taxonomy, provide these instructions:

1. **Read the source material** and identify all thinkers (people who contribute ideas) and concepts (ideas, models, frameworks, theories).

2. **For each thinker**, determine:
   - A unique lowercase `id` (slugified surname, e.g., `argyris`, `von_bertalanffy`)
   - Their `eminence` based on described influence and citation density
   - Their `generation` based on active dates and described intellectual lineage
   - Their `stream` based on their primary domain
   - Their `structural_role` based on their position in the network

3. **For each concept**, determine:
   - A unique lowercase `id` (slugified name, e.g., `double_loop`, `drift_into_failure`)
   - The `originator_id` (which thinker first articulated it). Omit if unclear.
   - The `concept_type` from the six options
   - The `abstraction_level` from the four options
   - The `status` (most extracted concepts will be `active`)

4. **For each relationship**, determine:
   - The `from` and `to` node IDs
   - The `type` from the 15 edge types above
   - A `note` explaining the relationship in one sentence
   - A `weight` (0.0–1.0) if the connection is uncertain: use 1.0 for explicitly stated relationships, 0.7 for strong inferences, 0.4 for weak associations

5. **Output the result** in the exact markdown format described in this schema, with proper fenced code blocks and KV pairs.

6. **Quality checks**:
   - Every `originator_id` should reference an existing thinker `id`
   - Every edge `from` and `to` should reference existing node IDs
   - Generations should be sequential and consistent with dates
   - Streams should be consistent (same stream ID for same domain)
   - Avoid duplicate nodes (same person/concept appearing twice)
   - Flag uncertain classifications with a `notes:` field explaining the uncertainty

---

*Schema derived from Randall Collins, The Sociology of Philosophies (1998). Formalized for machine parsing by concept-mapper.*
