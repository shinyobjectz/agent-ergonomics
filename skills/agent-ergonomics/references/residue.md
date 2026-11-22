# Residue: text shaped by where it was made

Text written during a conversation, a ticket or a review picks up that context. The reader of the finished text
never saw any of it. Every one of these makes the reader wonder what they missed.

## The forms it takes

- **History in the present tense.** "Now supports PNG", "no longer requires login", "the new dashboard", "we've
  updated", "improved", "instead of the old way". To a first-time reader there's no before. Describe what the thing
  is and does. History belongs in a changelog, a commit message or release notes, and only there.
- **Answers to questions the reader didn't ask.** "Unlike X, this doesn't…", "we chose Y over Z because…", "this isn't
  a replacement for…". These defend a choice against an alternative someone raised in the conversation. Keep a
  comparison only if the reader would actually be weighing it.
- **References to the conversation.** "As requested", "as discussed", "per your note", "the approach we agreed on",
  "the issue you mentioned", "option B".
- **Names only insiders know.** Codenames, ticket and task ids, phase numbers, branch names, the name of whoever
  asked, internal team names, a project's working title. Use the name the reader knows, or describe the thing.
- **The brief's phrases.** Lines lifted from the request ("make it feel effortless", "for power users") that read like
  direction rather than copy. A brief tells you what to write, and isn't itself the copy.
- **Process instead of product.** "After careful analysis", "we tested several approaches", "this was a big effort".
  The reader wants the result.
- **Hedges carried from uncertainty in the chat.** "Should now work", "this may fix", "seems to". Either it's true
  and you say so, or you check first.
- **Placeholders and leftovers.** "TODO", "TBD", "lorem ipsum", "[insert link]", "v2-final", a sample name left in
  the real copy, a sentence that ends mid-thought after an edit.
- **Meta-commentary.** "This section explains…", "Note:", "As mentioned above", "Below you'll find". Let the text
  move without narrating itself.

## Words to search for

Each hit gets a look, not an automatic fix. Some are fine in a changelog.

```
now, new, newly, no longer, anymore, instead of, used to, previously, updated, improved, fixed, replaced, migrated,
as requested, as discussed, as mentioned, per, agreed, option [A-Z], v[0-9], final, latest, TODO, TBD, FIXME,
lorem, placeholder, insert, should now, may now, seems to, this section, below you'll find, note:
```

## The test

Read each sentence and ask: **would this make sense, and be worth reading, to someone who arrived here with no
context?** If it needs the conversation to make sense, rewrite it to stand on its own or cut it.

## Commit messages and PR descriptions

These are history by nature, so "replaced", "fixed" and "previously" belong in them. Residue there looks different:
references to the chat ("as you asked"), to the agent's process ("I tried several approaches"), or to task ids nobody
outside the session can resolve. Say what changed and why, in terms a maintainer reading `git log` next year can use.
