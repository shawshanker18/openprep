---
skill: m-psda-claims
minutes: 9
tags: [generalization, causation, experimental-design, sampling-bias]
---
## What this skill is

These questions describe a study and ask which conclusion it supports. Two design features decide almost everything: **how the participants were selected** (which controls **generalization**) and **whether treatments were randomly assigned** (which controls **causation**). You also need to spot **sampling bias** and compare results between groups.

## Key ideas

- **Random selection** from a population lets you generalize the results to that population, and only that one.
- **Random assignment** of treatments in an experiment lets you conclude cause and effect.
- An **observational study** (no assigned treatment) can show an association, never causation. People who choose a behavior may differ in other ways.
- **Sampling bias** happens when the method favors certain people: volunteers, people who visit one website, customers at one store, or only those easy to reach.
- The strongest claims on the SAT are usually the most modest ones. Wording like "proves," "all," or "will" is a red flag.

## Formulas and rules

| Random selection? | Random assignment? | What you can conclude |
|---|---|---|
| yes | yes | cause and effect, for the whole population sampled |
| yes | no | association only, for the population sampled |
| no | yes | cause and effect, only for the participants (and similar people) |
| no | no | association only, for the participants |

Comparing groups: subtract the percents or rates, and report the result in **percentage points** when the question asks for the difference between two percents.

### Who the results describe

A random sample describes the population it was drawn from, and nobody else. A poll of Denver adults ages $30$ to $45$ describes Denver adults in that age group, not all adults in Colorado.

### Confounding variables

An association can have a third cause. If students who join a club also get better grades, the club may not be the reason, because the students who join may already be stronger. Only random assignment rules out such third causes.

## Worked example 1 (easy)

A researcher randomly selected $300$ members of a grocery chain's loyalty program and found that 62% prefer evening hours. To which group can this result be generalized?

1. The sample was chosen at random, so it represents the group it was drawn from.
2. That group is the **loyalty program members** of this chain. Not all shoppers, and not all residents of the area.

## Worked example 2 (SAT-level)

*A company recruited $80$ volunteer employees. Half were randomly assigned to use standing desks and half kept their usual desks. After $8$ weeks, $26$ of the $40$ standing-desk users and $18$ of the $40$ others reported less back pain. What do the results support?*

1. Compute each rate: $\frac{26}{40} = 0.65$, or 65%, and $\frac{18}{40} = 0.45$, or 45%. The difference is $20$ percentage points.
2. Treatments were **randomly assigned**, so it is reasonable to conclude that standing desks caused the reduction in back pain **for these participants**.
3. The participants were **volunteers**, not a random sample, so the result cannot be generalized to all employees or all office workers.

The best choice says that standing desks likely reduce back pain for people similar to those in the study. A choice claiming the effect for "all office workers" overreaches.

## Common traps

- **Claiming causation from a survey.** If people who garden report less stress, gardening has not been shown to reduce stress.
- **Generalizing beyond the sampled group.** A random sample of one university's students says nothing reliable about adults who are not students.
- **Assuming a large sample cures bias.** Thousands of call-in votes to a radio show are still a self-selected group.
- **Mixing up selection and assignment.** Random selection is about *who is studied*; random assignment is about *who gets which treatment*.
- **Reporting a ratio instead of a difference.** If the question asks "by how many percentage points," subtract; do not divide.

## The fast way (and when to use Desmos)

Desmos is no help here, because this skill is about reasoning, not computing. The fast way is a two question checklist for every study:

1. **Who was selected, and how?** If randomly from a population, the conclusion can apply to that population. Otherwise, only to the participants.
2. **Were treatments randomly assigned?** If yes, causal language ("causes," "leads to," "is effective") is allowed. If no, only "is associated with."

Then eliminate any answer that claims more than both checks allow. When there is a computation, such as the difference between two group percents, do it by hand: it is one division per group and one subtraction.
