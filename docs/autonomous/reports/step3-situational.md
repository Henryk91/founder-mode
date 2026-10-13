# Step 3: situational events as a general system

## What changed

- The condition language (closed `path op number` grammar, zod-validated) gained `team.size`, `runwayWeeks`, and sender paths `sender.overdue` and `sender.silent`, allowed only inside an effect's `when` of an event with a customer or lead sender.
- The engine reads conditions with the message's sender; a view-based evaluator (`viewConditionValue`, `viewConditionsHold`) reads the same paths from `PlayerView`, and a test checks the two agree on every path over played runs, so outcomes depend only on what the player sees.
- Converted: the year 2 chase effects declare `sender.overdue` (7 effects, 4 events); the reader derives its answer from declared conditions (`fromConditions`) for 18 Kantino and shared events and their Zollstock twins, replacing hand-written rules.
- Docs: `docs/schema.md`, authoring rule (a condition must be stated in the event's text), `docs/decisions.md` "Step 3".

## Tests

Condition language (paths, parsing, sender paths refused in a draw or without a sender), view against engine agreement, the reader's derived answers in named situations, effects that depend on the sender, determinism.

## Protected games

60 week game, both scenarios: main, paired and inbox on 10,000 seeds identical to `docs/balancing.md` apart from timings and parts not run. Kantino long mode: main and inbox on 10,000 seeds identical likewise. 60 week content files unchanged (fingerprints locked).

## Targets and open issues

No target changed. Open issues unchanged (STATUS.md).
