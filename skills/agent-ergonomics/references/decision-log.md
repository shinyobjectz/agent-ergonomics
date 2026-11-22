# The decision log

Keep it in a file in the project, such as `docs/untangle.md`, from step 3 on. It's what a session resumes from after
compaction, and what the user reviews. Write it in plain prose: someone who never saw the conversation should be able
to act on it.

## Format

1. **How the evidence was gathered:** a few lines on the graph, the history range, the census and the transcripts.
2. **Open decisions:** the optional additions, and any fix that needs the user's call.
3. **Baseline measures:** a table of each number, today's value, and what done looks like.
4. **The fixes,** ordered by how many problems each removes. Each fix is one bolded paragraph saying what the system becomes, followed by
   the problems it solves, each with file and line.
5. **Special cases kept,** each with the outside reason it stays.
6. **Order of work,** and how each landing proves behaviour is unchanged.

## Example

The list of problems, as first written down:

```md
- `ui/LogoutDialog.tsx:30` waits 100 ms after closing and hopes the message input can take focus by then.
- `ui/Toolbar.tsx:40` and `ui/Menu.tsx:22` call the same actions, each with its own check for when they're disabled.
- `checkout/submit.ts:9` depends directly on `payments/stripe.ts`.
- `cli/args.ts:12` parses `--dry-run` by hand, and `docs/cli.md` documents it separately; `--force` is in the docs
  but not the parser.
- `ui/SettingsDialog.tsx:61` sets a global `skipRefocus` flag to stop the logout dialog from moving focus.
- `refunds/refund.ts:22` wraps every Stripe call in `if (order.provider === "paypal")`.
- Agent transcripts: 4 of 10 runs called `export` without `--json` and parsed the human table (friction:
  context-bloat, ambiguous-error).
```

Then with the fixes:

```md
**Make the general `Dialog` return focus to whatever had it before it opened**, so the wait and the flag both go.
- `ui/LogoutDialog.tsx:30` waits 100 ms after closing and hopes the message input can take focus by then.
- `ui/SettingsDialog.tsx:61` sets a global `skipRefocus` flag to stop the logout dialog from moving focus.

**Define a `PaymentProvider` that Stripe and PayPal both implement**, so checkout and refunds stop knowing which one
they use.
- `checkout/submit.ts:9` depends directly on `payments/stripe.ts`.
- `refunds/refund.ts:22` wraps every Stripe call in `if (order.provider === "paypal")`.

**Declare each command once (name, flags with types and docs, handler, JSON shape)** and generate the parser, the
help and the docs from it. JSON becomes the default when stdout isn't a terminal.
- `cli/args.ts:12` parses `--dry-run` by hand, and `docs/cli.md` documents it separately; `--force` is in the docs
  but not the parser.
- Agent transcripts: 4 of 10 runs parsed the human table.

**Make every user action a command with a name, a handler and an enabled check**, so the toolbar and the menu run
from one list.
- `ui/Toolbar.tsx:40` and `ui/Menu.tsx:22` call the same actions, each with its own disabled check.
```
