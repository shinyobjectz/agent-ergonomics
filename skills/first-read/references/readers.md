# How people and agents read

## People

- **They scan, then satisfice.** Most people don't read a screen; they sweep it for words that match their goal, and
  take the first option that looks good enough. They rarely work out how something works if they can get by without
  knowing (Krug calls it muddling through). Write so the scanned words alone carry the meaning: headings, the first
  words of lines, buttons, links.
- **They follow scent.** Like animals foraging, people follow cues that predict the information they want
  (information foraging theory, Pirolli and Card). A link or label with strong scent uses the reader's words for the
  thing they want. Weak scent (clever names, internal terms, generic labels like "Resources") sends them back or
  sideways.
- **Working memory is small.** People hold roughly four new chunks at once (Cowan). Each unfamiliar term, option or
  rule takes a slot. Familiar ones chunk together and nearly come for free.
- **Load has three parts** (Sweller). Some difficulty is in the task itself and can't be removed. Some is added by
  the presentation: confusing layout, jargon, things to remember from one screen to the next. That part is pure
  waste, and it's the designer's to remove. What's left goes to building the reader's understanding.
- **They bring a model from elsewhere.** People expect a product to work like the ones they already use (Jakob's
  law). Matching that model makes the product feel obvious. Breaking it costs a relearning that has to be worth it.
- **The design is the only explanation they get.** The designer has a model of how the product works. The user
  builds their own from what the product shows them (Norman's system image). If the screens, names and feedback don't
  carry the model, no manual will fix it.
- **Recognition beats recall.** Seeing the options is easier than remembering them. Show choices, recent items and
  examples rather than expecting people to know them.
- **Examples teach, definitions label.** People understand a concept from two or three concrete examples, and use
  the definition to name what they've already understood.

## Agents

- **They read everything, literally.** Nothing is skimmed, so every word costs tokens and every ambiguity gets
  resolved, often wrongly. There's no "they'll figure out what I meant".
- **Names are meaning.** An agent can't ask what you intended. A tool called `sync` that also deletes will be called
  when deleting is wrong. Names, descriptions and the first responses are its entire model of your system.
- **Priors dominate.** An agent reaches for the convention it has seen most often: `--help`, `--json`, REST verbs,
  common file layouts, popular library APIs. Matching priors is free. Breaking them needs a clear signal at the
  point of use, or the agent will follow its prior anyway.
- **Context is a budget.** A long tool list, a large instruction file or a verbose response pushes out what it
  needed to remember. Disclosure has to be progressive for agents too.
- **No memory across sessions.** It relearns the system every time unless durable state (files, a status command, a
  short instruction file) teaches it fast.
- **Confident when wrong.** An agent acts on a misreading without hesitating, so ambiguity turns directly into wrong
  actions rather than questions.

## Both

- A term met before it's explained stalls a person and misleads an agent.
- Synonyms suggest there are two things. Collisions (one word, two meanings) make a person doubt and an agent err.
- A taxonomy the reader doesn't act on is noise to both: a person skips it, and an agent pays for it and may act on
  it anyway.
- Both judge a product in the first moments: a person decides whether to keep going, and an agent picks a path it
  will keep following.

## The builder's blind spot

The curse of knowledge: once you know something, you can't imagine not knowing it. Builders read their own product
with every term already defined and every concept already linked, so it always seems clear. The only reliable checks
are readers who don't know: real users, cold agents, colleagues from another team.
