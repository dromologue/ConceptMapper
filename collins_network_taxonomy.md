# Collins Network Taxonomy

## A Reusable Schema for Mapping Intellectual Influence

Derived from Randall Collins, *The Sociology of Philosophies* (1998).
Generalised for application to any network of thinkers or concepts.

---

## 1. Purpose

This taxonomy provides a structured way to describe any intellectual network so that a diagram can be generated from the data. It covers people, concepts, and the relationships between them. The taxonomy encodes the six structural principles Collins identifies as universal across 2,500 years of intellectual history.

The schema has three layers:

- **Nodes**: thinkers and concepts
- **Edges**: relationships between nodes
- **Structure**: the generational, positional, and attention-space properties of the network as a whole

---

## 2. Node Types

### 2.1 Thinker Node

A person who contributes ideas to the network.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (e.g. `argyris`) |
| `name` | string | Display name (e.g. `Chris Argyris`) |
| `dates` | string | Birth–death or birth only (e.g. `1923–2013`) |
| `eminence` | enum | `dominant`, `major`, `secondary`, `minor` |
| `generation` | integer | Generational cohort number (1 = earliest) |
| `stream` | string | Intellectual stream or domain (e.g. `psychology`) |
| `structural_role` | enum | See §4 below |
| `active_period` | string | Approximate years of peak influence (e.g. `1960–1995`) |
| `key_concept_ids` | list | Concepts originated or most associated with |
| `institutional_base` | string | Primary organisational affiliation (e.g. `Harvard`, `Toyota`) |
| `notes` | string | Free text for context |

#### Eminence Tiers (after Collins)

| Tier | Definition | Diagnostic |
|------|-----------|------------|
| **Dominant** | Shapes the field across multiple generations; referenced by most other nodes | High upstream AND downstream density; concepts still actively contested |
| **Major** | Redirects a stream for at least one generation; produces widely adopted concepts | Moderate-to-high density; at least one concept in active use |
| **Secondary** | Notable contribution; refines, extends, or applies ideas from dominant/major nodes | Moderate density; concepts used but rarely contested |
| **Minor** | Active participant; known mainly through connection to more eminent nodes | Low density; few independent concepts |

### 2.2 Concept Node

An idea, model, framework, or theory that circulates through the network.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (e.g. `double_loop_learning`) |
| `name` | string | Display name (e.g. `Double-Loop Learning`) |
| `originator_id` | string | Thinker who first articulated it |
| `date_introduced` | string | Year or decade of first publication |
| `concept_type` | enum | See below |
| `abstraction_level` | enum | `concrete`, `operational`, `theoretical`, `meta-theoretical` |
| `status` | enum | `active`, `absorbed`, `contested`, `dormant`, `superseded` |
| `generation` | integer | Generation in which it first appeared |
| `stream` | string | Primary intellectual stream |
| `notes` | string | Free text |

#### Concept Types

| Type | Definition | Example |
|------|-----------|---------|
| **Framework** | A structured model for analysis or action | Cynefin, VSM, OODA |
| **Principle** | A general claim about how things work | Local rationality, Requisite variety |
| **Distinction** | A named contrast between two or more things | Espoused theory vs theory-in-use |
| **Mechanism** | A causal process that explains why something happens | Defensive routines, Drift into failure |
| **Prescription** | A recommendation for action | Drive out fear, Bias for action |
| **Synthesis** | A concept that combines ideas from multiple sources | Seven conditions for learning (series) |

#### Abstraction Levels (after Collins' abstraction-reflexivity sequence)

| Level | Definition | Example |
|-------|-----------|---------|
| **Concrete** | Directly observable practice or tool | Kanban board, Standup meeting |
| **Operational** | A method or procedure with defined steps | PDSA cycle, Immunity map |
| **Theoretical** | An explanatory model of how a domain works | Structuration theory, Prospect theory |
| **Meta-theoretical** | A theory about how theories work or change | Paradigm shift, Abstraction-reflexivity sequence |

---

## 3. Edge Types

Every relationship between two nodes (thinker-thinker, thinker-concept, or concept-concept) is classified by type and direction.

### 3.1 Thinker-to-Thinker Edges

| Edge Type | Direction | Definition | Visual Convention |
|-----------|-----------|-----------|-------------------|
| `teacher_pupil` | Directed (elder → younger) | Direct pedagogical relationship | Solid line, arrow downstream |
| `chain` | Directed | Personal contact transmitting cultural capital; not necessarily formal teaching | Solid line, arrow downstream |
| `rivalry` | Undirected | Contemporaneous opposition on shared questions | Dashed red line |
| `alliance` | Undirected | Parallel or complementary work; mutual reinforcement | Dotted grey line |
| `synthesis` | Directed (sources → synthesiser) | One thinker integrates ideas from two or more others | Solid line, converging arrows |
| `institutional` | Undirected | Shared organisational affiliation without direct intellectual exchange | Thin dotted line |

### 3.2 Thinker-to-Concept Edges

| Edge Type | Direction | Definition |
|-----------|-----------|-----------|
| `originates` | Thinker → Concept | The thinker first articulated this concept |
| `develops` | Thinker → Concept | The thinker significantly extended or refined a concept originated by someone else |
| `contests` | Thinker → Concept | The thinker explicitly opposes or critiques this concept |
| `applies` | Thinker → Concept | The thinker uses the concept as a tool within their own framework |

### 3.3 Concept-to-Concept Edges

| Edge Type | Direction | Definition |
|-----------|-----------|-----------|
| `extends` | Directed | Concept B builds directly on Concept A |
| `opposes` | Undirected | The two concepts represent rival answers to the same question |
| `subsumes` | Directed | Concept B absorbs Concept A as a special case |
| `enables` | Directed | Concept A is a precondition for Concept B to operate |
| `reframes` | Directed | Concept B recasts the problem that Concept A addresses |

---

## 4. Structural Roles

Collins identifies recurring structural positions that thinkers occupy within networks. These are properties of network position, not of individual character.

| Role | Definition | Diagnostic |
|------|-----------|------------|
| **Chain originator** | First node in a lineage; often retrospectively elevated | High downstream links, few or no upstream links |
| **Chain transmitter** | Passes cultural capital from one generation to the next without major transformation | Moderate upstream and downstream; few original concepts |
| **Organisational leader** | Creates the institutional conditions for a group; not necessarily the intellectual leader | High institutional connectivity; may be lower eminence than the intellectual leader they enable |
| **Intellectual leader** | Produces the ideas that define a group or movement | High concept origination; typically dominant or major eminence |
| **Synthesiser** | Integrates previously rival positions into a new framework | Multiple inbound synthesis edges from different streams |
| **Structural rival** | Contemporaneous opponent of comparable stature; the rivalry defines both positions | Rivalry edge to another node of similar eminence in the same generation |
| **Twilight creator** | Last in a chain; produces major work without successors | High upstream density, zero or near-zero downstream |
| **Isolate** | Eminent thinker with few network connections; rare among dominant figures | Low density in all directions; analytically interesting |
| **Peripheral critic** | Outside the main network but producing influential critiques of it | Low density but high-impact contest edges |

---

## 5. Network-Level Properties

These describe the structure of the network as a whole, not individual nodes.

| Property | Type | Definition |
|----------|------|-----------|
| `attention_space_count` | integer per generation | Number of distinct active positions (Collins predicts 3–6) |
| `network_density` | float per generation | Average connections per thinker |
| `chain_depth` | integer | Longest unbroken teacher-pupil chain in the network |
| `active_rivalries` | list per generation | Pairs of rival positions currently contested |
| `external_shocks` | list | Events that altered the institutional base (date + description) |
| `abstraction_trend` | enum | `rising`, `stable`, `declining` — the direction of the abstraction-reflexivity sequence |
| `synthesis_points` | list | Generations where rival positions merged |
| `fission_points` | list | Generations where a dominant position split |

---

## 6. Example: How We Learn Phase (Organisational Prompts)

### 6.1 Generations

| Gen | Period | Label | Attention Space Count |
|-----|--------|-------|-----------------------|
| 1 | ~1880–1920 | Founders | 3 (scientific management, social theory, integration) |
| 2 | ~1930–1960 | Systematisers | 4 (management theory, structural functionalism, systems/quality, behavioural science) |
| 3 | ~1960–1985 | Flowering | 5 (management critique, social reproduction, complexity, cognitive science, sensemaking) |
| 4 | ~1985–2005 | Extensions | 5 (learning org, developmental psychology, adaptive leadership, safety culture, complexity practice) |
| 5 | ~2000–present | Practitioners | 4 (complexity practice, psychological safety, safety science, narrative/sense methods) |

### 6.2 Streams

| Stream ID | Name | Colour | Description |
|-----------|------|--------|-------------|
| `mgmt` | Management & Organisation | Blue | How organisations should be designed, governed, and led |
| `social` | Social Structure & Power | Red | How social structures reproduce themselves and constrain action |
| `systems` | Systems & Complexity | Green | How feedback, emergence, and systemic causation operate |
| `psychology` | Psychology & Cognition | Amber | How individuals think, learn, and develop |
| `sensemaking` | Sensemaking & Safety | Purple | How meaning is constructed and how failure is understood |

### 6.3 Selected Thinker Nodes

```
id:           argyris
name:         Chris Argyris
dates:        1923–2013
eminence:     dominant
generation:   2
stream:       psychology
structural_role: intellectual_leader, chain_originator
active_period: 1960–1995
key_concept_ids: [double_loop, defensive_routines, espoused_vs_inuse, model_I_II]
institutional_base: Harvard Business School
```

```
id:           stacey
name:         Ralph Stacey
dates:        1942–2021
eminence:     major
generation:   3
stream:       systems
structural_role: structural_rival, peripheral_critic
active_period: 1990–2015
key_concept_ids: [complex_responsive_processes, shadow_system, paradox_of_control]
institutional_base: University of Hertfordshire
```

```
id:           senge
name:         Peter Senge
dates:        b. 1947
eminence:     major
generation:   4
stream:       systems
structural_role: synthesiser
active_period: 1990–2010
key_concept_ids: [learning_organisation, five_disciplines, system_archetypes]
institutional_base: MIT Sloan
```

### 6.4 Selected Concept Nodes

```
id:           double_loop
name:         Double-Loop Learning
originator_id: argyris
date_introduced: 1977
concept_type: distinction
abstraction_level: theoretical
status:       active
generation:   3
stream:       psychology
```

```
id:           cynefin
name:         Cynefin Framework
originator_id: snowden
date_introduced: 1999
concept_type: framework
abstraction_level: operational
status:       active
generation:   5
stream:       sensemaking
```

```
id:           seven_conditions
name:         Seven Conditions for Organisational Learning
originator_id: series_synthesis
date_introduced: 2024
concept_type: synthesis
abstraction_level: theoretical
status:       active
generation:   5
stream:       systems
notes:        Series-originated concept drawing on all How We Learn thinkers
```

```
id:           just_culture
name:         Just Culture
originator_id: dekker
date_introduced: 2007
concept_type: framework
abstraction_level: operational
status:       active
generation:   5
stream:       sensemaking
```

```
id:           drift_into_failure
name:         Drift into Failure
originator_id: dekker
date_introduced: 2011
concept_type: mechanism
abstraction_level: theoretical
status:       active
generation:   5
stream:       sensemaking
```

```
id:           structuration
name:         Structuration Theory
originator_id: giddens
date_introduced: 1984
concept_type: framework
abstraction_level: meta-theoretical
status:       active
generation:   3
stream:       social
```

```
id:           prospect_theory
name:         Prospect Theory
originator_id: kahneman
date_introduced: 1979
concept_type: framework
abstraction_level: theoretical
status:       active
generation:   3
stream:       psychology
```

```
id:           system_1_2
name:         System 1 / System 2
originator_id: kahneman
date_introduced: 2011
concept_type: distinction
abstraction_level: operational
status:       active
generation:   5
stream:       psychology
notes:        Popularisation of dual-process theory; operational naming
```

### 6.5 Selected Edges

#### Thinker-to-Thinker

```
from: taylor    to: argyris    type: chain
  note: Model I as Taylorism internalised as management psychology

from: argyris   to: edmondson  type: teacher_pupil
  note: Edmondson studied under Argyris at Harvard

from: argyris   to: senge      type: chain
  note: Learning organisation draws directly on Argyris' learning theory

from: deming    to: senge      type: chain
  note: Systems thinking and quality lineage

from: beer      to: snowden    type: chain
  note: Snowden worked with Beer; cybernetics into complexity

from: weber     to: parsons    type: chain
  note: Parsons translated Weber into English; structural functionalism

from: parsons   to: giddens    type: chain
  note: Giddens critiqued Parsons; structuration as response to functionalism

from: stacey    to: senge      type: rivalry
  note: Core rivalry of the phase. Can you design a learning organisation
        or does learning emerge from complex responsive processes?

from: follett   to: taylor     type: rivalry
  note: Integration vs unilateral control; power-with vs power-over

from: mintzberg to: drucker    type: rivalry
  note: Emergent vs deliberate strategy

from: kahneman  to: weick      type: alliance
  note: Both study cognition under uncertainty; different methods
        and conclusions

from: deming    to: argyris    type: alliance
  note: Drive out fear / remove defensive routines; systemic not
        individual cause
```

#### Thinker-to-Concept

```
from: argyris   to: double_loop        type: originates
from: dekker    to: just_culture        type: originates
from: dekker    to: drift_into_failure  type: originates
from: snowden   to: cynefin             type: originates
from: giddens   to: structuration       type: originates
from: kahneman  to: system_1_2          type: originates
from: senge     to: seven_conditions    type: develops
  note: Senge's disciplines are partial inputs to the series synthesis
from: stacey    to: double_loop         type: contests
  note: Stacey argues you cannot reliably produce double-loop learning
        because the process of surfacing assumptions is itself shaped
        by power and ideology
from: dekker    to: system_1_2          type: applies
  note: Local rationality and hindsight bias as System 1 phenomena
from: snowden   to: double_loop         type: reframes
  note: Cynefin reframes learning as domain-dependent; double-loop is
        applicable in complicated domains but insufficient in complex ones
```

#### Concept-to-Concept

```
from: double_loop         to: seven_conditions   type: enables
  note: Double-loop learning is the mechanism behind Condition 2
        (undiscussables become discussable)

from: just_culture        to: double_loop         type: enables
  note: Just culture creates the safety conditions that allow
        defensive routines to be examined

from: system_1_2          to: drift_into_failure   type: enables
  note: System 1 dominance under pressure explains why drift
        is locally rational

from: structuration       to: drift_into_failure   type: extends
  note: Work-as-imagined vs work-as-done is the structuration gap
        between discursive consciousness and practical consciousness

from: cynefin             to: double_loop          type: reframes
  note: Double-loop works in the complicated domain; the complex
        domain requires probe-sense-respond instead

from: prospect_theory     to: system_1_2           type: extends
  note: System 1/2 is the popularisation of the cognitive architecture
        that prospect theory was built on
```

### 6.6 External Shocks

```
date: 1950s
description: Quality revolution in Japan; Deming's methods adopted
             outside Western management orthodoxy

date: 1980s
description: Japanese manufacturing success forces re-examination of
             Taylorist production methods in the West

date: 2001
description: Agile Manifesto; software industry formalises rejection
             of waterfall (plan-then-execute) methods

date: 2010s
description: DevOps and cloud; operational feedback loops shorten
             dramatically; Deming's principles rediscovered in tech

date: 2023–present
description: Generative AI; specification becomes the means of
             production; the capacity to describe precisely what is
             needed becomes the binding constraint on capability
```

### 6.7 Key Structural Observations

- **Attention space**: The How We Learn network sustains 4–5 active positions per generation, consistent with Collins' law of small numbers.
- **Chain depth**: The longest chain runs Taylor → Argyris → Senge → (series synthesis), spanning four generations.
- **Central rivalry**: Stacey vs Senge is the structural centre; their opposition defines what "organisational learning" means for two generations.
- **Emerging cluster**: The sensemaking/safety stream (Weick → Snowden, Dekker, Edmondson) is the densest sub-network in Generations 4–5, suggesting a structural crunch in progress.
- **Thinning stream**: The management stream has no active nodes after Generation 3; its intellectual energy has been absorbed into systems and sensemaking.
- **Abstraction trend**: Rising across the network. Generation 1 is concrete (how to organise work). Generation 3 is theoretical (how cognition and social structure shape what can be learned). Generation 5 is approaching meta-theoretical (Cynefin as a framework for choosing frameworks).
- **The AI shock**: Generative AI functions as a Collins-style external shock that is forcing repositioning. The systems stream is likely to split (cybernetic control vs emergent complexity); the psychology and sensemaking streams are likely to merge around human-AI decision-making. Expect 2–3 new concept nodes to crystallise in Generation 6.

---

## 7. Using This Taxonomy

### To map a new network

1. List all thinker nodes with eminence, generation, and stream
2. List all concept nodes with type, abstraction level, and status
3. Document all edges (thinker-thinker, thinker-concept, concept-concept) with types
4. Assign structural roles based on edge density
5. Count attention-space positions per generation; verify 3–6 range
6. Identify external shocks and trace two-step causality
7. Note the abstraction trend
8. Identify the central rivalry (there is almost always one)

### To generate a diagram

- **Y-axis**: generations (earliest at top)
- **X-axis**: streams (grouped by intellectual domain)
- **Node size/weight**: eminence tier
- **Node colour**: stream
- **Solid lines**: chain and teacher-pupil edges
- **Dashed red lines**: rivalry edges
- **Dotted grey lines**: alliance edges
- **Concept nodes** (if included): smaller, rounded rectangles below or beside their originator

### To predict structural pressures

- More than 6 positions in a generation → expect consolidation or synthesis
- Fewer than 3 positions → expect stagnation or external shock
- A dominant position with no rival → expect internal fission
- A stream with no active nodes → expect absorption or revival
- An external shock → expect two-step causality: institutional change, then intellectual repositioning

---

*Taxonomy derived from Randall Collins, The Sociology of Philosophies: A Global Theory of Intellectual Change (Harvard University Press, 1998). Adapted for the Organisational Prompts series at organisationalprompts.ai.*
