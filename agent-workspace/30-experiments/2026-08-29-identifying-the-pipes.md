---
date: 2026-08-29
area: tooling
outcome: kept
---

# Four wrong guesses about which system drew the "pipes"

## Why

Thick pale-teal vertical "pipes" dominated the midground, each apparently
carrying a red flower cluster. They had to go.

## What was changed

Nothing, for four rounds — because I kept editing the wrong system.

1. Guessed micro-sprig stems → thinned and darkened them → **no change**
2. Guessed wiry filler stems → halved width, darkened → **no change**
3. Debug-tagged each candidate bright green → misread the result in a dark,
   sage-hazed frame
4. Finally: **runtime visibility bisection** — hid all instanced meshes
   (pipes vanished), then hid groups by instance count until the culprit was
   isolated. They were the **feather-clump threads**: 0.17 m long, 6 px wide,
   bright mint, because a previous "make filigree fuller" edit had scaled them
   up.

## Result

Kept (the eventual fix). The four wasted rounds are the point of this entry.

## What the next agent should know

When you cannot identify which system draws something, **do not guess twice**.
Bisect at runtime — it takes two minutes and is definitive:

```js
const inst = []; app.scene.traverse(o => { if (o.isInstancedMesh) inst.push(o); });
inst.forEach(m => m.visible = false); app.post.composer.render();   // still there?
```

Then re-enable by group. A debug colour tint is *less* reliable than visibility
in a scene with heavy haze and grading — the tint gets mixed toward the
atmosphere and stops looking like the colour you set.
