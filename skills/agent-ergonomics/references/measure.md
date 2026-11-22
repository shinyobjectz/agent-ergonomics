# Measuring: the cold read, eval sets, baselines and judging

Start with the cheapest measure that would change a decision. Add more only when that measure can't answer the
question.

## The cold read

This tests whether text an agent must act on (a skill, a README, `--help`, a tool list, a guide) can be followed
from the text alone. If the weakest model that must succeed can follow it, stronger ones will too.

1. **Write questions with expected answers.** Write them before running anything, and never show the expected
   answers to the model.
   - One question per rule, decision, path and edge case the reader must handle. Action questions ("what do you run
     to do X?") expect the exact commands or edits.
   - Five general questions, each expecting `none`: terms that are ambiguous or undefined, passages that conflict
     (paths, names, numbers), facts stated twice, passages that could go without changing what an agent does, and
     situations with no instruction.
   - Two or three calibration questions that sound answerable but aren't. They expect `UNKNOWN`. A model that answers
     them is guessing, so its other answers can't be trusted.
2. **Run three times, with no tools and no thinking,** giving the model only the material and the questions, and
   telling it to answer `UNKNOWN` where the material doesn't say. Use the smallest model the material must still work
   for, in a fresh session with no memory of this one. Most agent CLIs have a one-shot mode for this; in Claude Code it's
   `claude -p --model haiku --tools "" --no-session-persistence < prompt.txt`.
3. **Grade strictly.** A question passes only if it's right in all three runs. A miss is evidence about the text, not
   the model. Quote the passage behind each miss and propose the smallest edit that fixes it.
4. **Condense.** Using the "could go" findings, write a shorter version and rerun the same questions. Keep a cut only
   if the answers about that part still match.

## Eval sets

A cold read checks the text. An eval set checks whether agents can do the job.

- **Tasks:** five to fifteen real, multi-step tasks with outcomes a script can verify, drawn from what users actually
  do. Include tasks where the right move is *not* to use the tool, or to stop and ask.
- **Profiles:** run each task on the weakest model that must succeed and on the usual one, at least three times
  each, in the harness people really use.
- **Measures:** success, calls, tokens, cost, wall time, and interventions by a person. Note what was covered.
- **Baseline:** run the same set against today's system before changing anything, and against the previous version
  after each change. A change is a lift only if it beats the baseline on success at an acceptable cost.
- **Transcripts on disk:** save every run before analysing it, and read the failing ones. Change one thing, rerun,
  and watch for fixes that only fit the eval set.

## Judging output

When a model grades an artifact (a page, a diagram, a render):

- **Describe, then grade.** A judge given the brief and the output will praise output that echoes the brief's words,
  even a stub. Have it describe what it sees without the brief, then grade that description against the brief.
- **Several judges, median.** Run two or three judges independently, take the median, and flag any that disagrees
  sharply. Agreement is your confidence.
- **Let the judge perceive the output.** Render a diagram to an image before a vision model grades it. A text model
  grading SVG source is guessing.
- **Red-team the measure.** Write cheap cheats (a stub, a placeholder, output that only passes on the first frame)
  and confirm the measure fails them. Anything an agent can satisfy cheaply, it eventually will.

## Honest numbers

- **Real or skip.** Never fill a number with an estimate or a mock. Mark it as not measured.
- **Unmeasured isn't zero.** Report coverage next to every result.
- **Hold the task fixed.** Compared tools or versions get the same task, inputs, seed and model.
- **No scores for their own sake.** Each number should answer a question someone will act on.
