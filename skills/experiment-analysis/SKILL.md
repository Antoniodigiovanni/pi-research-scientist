---
name: experiment-analysis
description: Analyze one experiment or comparison from records, artifacts, and read-only MLflow data while separating observation, statistical evidence, interpretation, and speculation. Use after runs complete.
---

# Experiment analysis

Read the preregistered design and exact run metadata before interpreting results. Confirm that runs used the intended data snapshot, split, configuration, code revision, model/checkpoint, seed set, and evaluation code. Mark deviations.

Organize the result into four explicit layers:

1. **Observation:** measured values, failures, missing runs, cost, and artifacts.
2. **Statistical evidence:** uncertainty intervals, variation across seeds, effect sizes, chosen tests, assumptions, and corrections.
3. **Interpretation:** what the evidence says about the registered hypothesis and competing explanations.
4. **Speculation:** plausible ideas requiring new evidence.

Check subgroup behavior, class imbalance, calibration, robustness, and compute tradeoffs when relevant to the claim. Do not call an increase meaningful from a point estimate alone. Do not silently exclude failed or inconvenient runs.

Update the experiment record with links to artifacts and MLflow run IDs, preserving observed values separately from prose. State the decision—accept provisionally, reject, inconclusive, or rerun—and the cheapest next test. Route cross-experiment conclusions through `experiment-synthesis`.
