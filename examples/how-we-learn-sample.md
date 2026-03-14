# How We Learn: Sample Network

## Generations

| Gen | Period | Label | Attention Space Count |
|-----|--------|-------|-----------------------|
| 1 | ~1880–1920 | Founders | 3 |
| 2 | ~1930–1960 | Systematisers | 4 |
| 3 | ~1960–1985 | Flowering | 5 |
| 4 | ~1985–2005 | Extensions | 5 |
| 5 | ~2000–present | Practitioners | 4 |

## Streams

| Stream ID | Name | Colour | Description |
|-----------|------|--------|-------------|
| mgmt | Management & Organisation | #4A90D9 | How organisations should be designed, governed, and led |
| social | Social Structure & Power | #D94A4A | How social structures reproduce themselves and constrain action |
| systems | Systems & Complexity | #4AD94A | How feedback, emergence, and systemic causation operate |
| psychology | Psychology & Cognition | #D9A84A | How individuals think, learn, and develop |
| sensemaking | Sensemaking & Safety | #9B59B6 | How meaning is constructed and how failure is understood |

## Thinker Nodes

```
id:           taylor
name:         Frederick Winslow Taylor
dates:        1856–1915
eminence:     dominant
generation:   1
stream:       mgmt
structural_role: chain_originator
active_period: 1880–1915
key_concept_ids: [scientific_management]
institutional_base: Bethlehem Steel
```

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
id:           deming
name:         W. Edwards Deming
dates:        1900–1993
eminence:     dominant
generation:   2
stream:       systems
structural_role: chain_originator, intellectual_leader
active_period: 1950–1993
key_concept_ids: [pdsa_cycle, system_of_profound_knowledge]
institutional_base: NYU Stern
```

```
id:           giddens
name:         Anthony Giddens
dates:        b. 1938
eminence:     major
generation:   3
stream:       social
structural_role: synthesiser
active_period: 1976–2000
key_concept_ids: [structuration]
institutional_base: Cambridge / LSE
```

```
id:           kahneman
name:         Daniel Kahneman
dates:        1934–2024
eminence:     dominant
generation:   3
stream:       psychology
structural_role: intellectual_leader
active_period: 1970–2011
key_concept_ids: [prospect_theory, system_1_2]
institutional_base: Princeton
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
id:           snowden
name:         Dave Snowden
dates:        b. 1954
eminence:     major
generation:   5
stream:       sensemaking
structural_role: synthesiser
active_period: 1999–present
key_concept_ids: [cynefin]
institutional_base: Cognitive Edge
```

```
id:           dekker
name:         Sidney Dekker
dates:        b. 1969
eminence:     major
generation:   5
stream:       sensemaking
structural_role: intellectual_leader
active_period: 2006–present
key_concept_ids: [just_culture, drift_into_failure]
institutional_base: Griffith University
```

```
id:           edmondson
name:         Amy Edmondson
dates:        b. 1959
eminence:     major
generation:   4
stream:       psychology
structural_role: chain_transmitter
active_period: 1999–present
key_concept_ids: [psychological_safety]
institutional_base: Harvard Business School
```

## Concept Nodes

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
```

```
id:               cynefin
name:             Cynefin Framework
originator_id:    snowden
date_introduced:  1999
concept_type:     framework
abstraction_level: operational
status:           active
generation:       5
stream:           sensemaking
```

```
id:               just_culture
name:             Just Culture
originator_id:    dekker
date_introduced:  2007
concept_type:     framework
abstraction_level: operational
status:           active
generation:       5
stream:           sensemaking
```

```
id:               drift_into_failure
name:             Drift into Failure
originator_id:    dekker
date_introduced:  2011
concept_type:     mechanism
abstraction_level: theoretical
status:           active
generation:       5
stream:           sensemaking
```

```
id:               structuration
name:             Structuration Theory
originator_id:    giddens
date_introduced:  1984
concept_type:     framework
abstraction_level: meta-theoretical
status:           active
generation:       3
stream:           social
```

```
id:               prospect_theory
name:             Prospect Theory
originator_id:    kahneman
date_introduced:  1979
concept_type:     framework
abstraction_level: theoretical
status:           active
generation:       3
stream:           psychology
```

```
id:               system_1_2
name:             System 1 / System 2
originator_id:    kahneman
date_introduced:  2011
concept_type:     distinction
abstraction_level: operational
status:           active
generation:       5
stream:           psychology
```

```
id:               learning_organisation
name:             Learning Organisation
originator_id:    senge
date_introduced:  1990
concept_type:     framework
abstraction_level: theoretical
status:           active
generation:       4
stream:           systems
```

```
id:               psychological_safety
name:             Psychological Safety
originator_id:    edmondson
date_introduced:  1999
concept_type:     principle
abstraction_level: operational
status:           active
generation:       4
stream:           psychology
```

## Edges

### Thinker-to-Thinker

```
from: taylor    to: argyris    type: chain
  note: Model I as Taylorism internalised as management psychology

from: argyris   to: edmondson  type: teacher_pupil
  note: Edmondson studied under Argyris at Harvard

from: argyris   to: senge      type: chain
  note: Learning organisation draws directly on Argyris' learning theory

from: deming    to: senge      type: chain
  note: Systems thinking and quality lineage

from: stacey    to: senge      type: rivalry
  note: Core rivalry — can you design a learning organisation or does learning emerge from complex responsive processes?

from: kahneman  to: dekker     type: alliance
  note: Both study cognition under uncertainty; Dekker operationalises Kahneman's biases for safety

from: deming    to: argyris    type: alliance
  note: Drive out fear / remove defensive routines; systemic not individual cause
```

### Thinker-to-Concept

```
from: argyris   to: double_loop        type: originates
from: dekker    to: just_culture        type: originates
from: dekker    to: drift_into_failure  type: originates
from: snowden   to: cynefin             type: originates
from: giddens   to: structuration       type: originates
from: kahneman  to: prospect_theory     type: originates
from: kahneman  to: system_1_2          type: originates
from: senge     to: learning_organisation type: originates
from: edmondson to: psychological_safety type: originates

from: stacey    to: double_loop         type: contests
  note: Stacey argues you cannot reliably produce double-loop learning

from: dekker    to: system_1_2          type: applies
  note: Local rationality and hindsight bias as System 1 phenomena

from: snowden   to: double_loop         type: reframes
  note: Cynefin reframes learning as domain-dependent
```

### Concept-to-Concept

```
from: double_loop         to: psychological_safety type: enables
  note: Double-loop learning requires the safety to surface undiscussables

from: just_culture        to: double_loop         type: enables
  note: Just culture creates safety conditions for examining defensive routines

from: system_1_2          to: drift_into_failure   type: enables
  note: System 1 dominance under pressure explains why drift is locally rational

from: structuration       to: drift_into_failure   type: extends
  note: Work-as-imagined vs work-as-done is the structuration gap

from: cynefin             to: double_loop          type: reframes
  note: Double-loop works in the complicated domain; complex requires probe-sense-respond

from: prospect_theory     to: system_1_2           type: extends
  note: System 1/2 popularises the cognitive architecture prospect theory was built on
```

## External Shocks

```
date: 1950s
description: Quality revolution in Japan; Deming's methods adopted outside Western orthodoxy

date: 2001
description: Agile Manifesto; software industry rejects waterfall methods

date: 2023–present
description: Generative AI; specification becomes the means of production
```

## Structural Observations

- **Attention space**: 4–5 active positions per generation, consistent with Collins' law of small numbers
- **Chain depth**: Taylor → Argyris → Senge → (synthesis), spanning four generations
- **Central rivalry**: Stacey vs Senge defines "organisational learning" for two generations
- **Emerging cluster**: Sensemaking/safety stream (Snowden, Dekker, Edmondson) is the densest in Generations 4–5
- **Abstraction trend**: Rising from concrete (Gen 1) to meta-theoretical (Gen 5)
