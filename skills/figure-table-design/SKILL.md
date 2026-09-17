---
name: figure-table-design
description: Design reproducible scientific figures and tables by mapping a specific claim to its evidence and representation. Use before rendering publication visuals or revising unclear results displays.
---

# Figure and table design

Begin with the exact scientific claim, the evidence needed to assess it, and the comparison readers must make. Then select a representation:

- method comparison: table or point/range display with uncertainty;
- scaling: curve with sample/compute scale and uncertainty;
- robustness: perturbation or sensitivity curve;
- component contribution: ablation table or plot;
- accuracy-cost tradeoff: Pareto-style plot;
- distribution shift: performance by domain or subgroup.

Create a plan in `paper/claims.md` or the figure/table source that specifies claim, source experiments, estimand, visual encoding, uncertainty, intended takeaway, and limitation. Show raw or disaggregated evidence when aggregation could hide variance. Use accessible labels, units, ordering, and color; avoid decorative dimensions and truncated axes that distort magnitude.

Generate published visuals from code and tracked data/artifacts. Do not manually edit scientific values. Include captions that state population, metric direction, uncertainty definition, repetitions, and exclusions. Verify that every displayed number traces to an experiment record or immutable output.
