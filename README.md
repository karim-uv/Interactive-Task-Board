# Day Board — an interactive task board

Task 4 of the Lime Light internship programme. A client-side Kanban board with three columns,
built with plain HTML, CSS and ES6 JavaScript — no framework, no build step, no dependencies.

**Live site:** https://karim-uv.github.io/Interactive-Task-Board/

## What it does

**Tasks.** Add a task with a title, an optional description, a category (Development, Design,
Marketing or Research) and a priority (Low, Medium or High). Move it between To do, In progress
and Completed. Delete it.

**Storage.** The board is written to `localStorage` after every change and read back on load, so a
refresh — or closing the tab and coming back tomorrow — leaves it exactly as it was.

**Priority at a glance.** High is red, Medium amber, Low green, shown on both the card's left edge
and its pill. Colour is never the only signal: the pill is also labelled, so the board still reads
correctly for anyone who cannot distinguish those hues.

**Finding things.** A search box filters by title as you type, and a dropdown filters by category.
They combine, and neither one touches the stored data — filtering happens at render time, so
clearing the search brings everything straight back.

**Responsive.** Three columns on desktop, two on tablet with Completed spanning the full width,
and a single stacked column on a phone with full-width controls.

### Bonus features

All three optional features from the brief are implemented:

- **Drag and drop**, using the native HTML5 API — `dragstart`, `dragover`, `drop`.
- **Light and dark mode**, remembered between visits and defaulting to the system setting.
- **A counter** in the header reading active against completed.

## How it is built

The whole app is one state array and one render function. Every action — adding, moving,
deleting, filtering — updates `tasks`, saves it, and redraws the board. Patching individual nodes
would be faster in theory, but at this size the redraw is instant and it removes the entire class
of bug where the screen and the data quietly disagree.

A few decisions worth naming:

- **Cards come from a `<template>`,** cloned and filled, rather than being assembled out of HTML
  strings. The structure stays in the HTML where it belongs, and values are written with
  `textContent`, so a task titled `<img src=x onerror=...>` is displayed as typed rather than
  parsed.
- **Dragging is a shortcut, not the only route.** Touch screens do not fire HTML5 drag events, so
  every card also carries arrow buttons. They are the reason the board is usable on a phone at
  all, and they disable themselves at the ends of the board.
- **Card listeners are attached once to the board,** not to each button, because cards are rebuilt
  on every render. Clicks bubble up and are identified by their `data-action`.
- **`dragover` calls `preventDefault()`.** Without it the browser refuses the drop outright — the
  step most often missed when implementing this API.
- **Storage access is wrapped in `try`/`catch`** and anything read back is validated before use. In
  a private window, or with site data blocked, the board still works for that visit instead of
  failing on load.
- **The columns live in one array,** so moving a task left or right is a step through it. Adding a
  fourth column would mean editing that array and the markup, and nothing else.

## Accessibility

Headings and landmarks are in order, the icon buttons carry screen-reader labels, the task counter
is a live region, focus is visible on every control, there is a skip link to the board, and
`prefers-reduced-motion` is respected.

## Structure

```
index.html      markup and the card template
css/style.css   tokens, theming, layout, responsive rules
js/app.js       state, storage, rendering, drag and drop, theme
```

Open `index.html` in a browser — there is nothing to install.
