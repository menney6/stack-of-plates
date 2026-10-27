# Plate Stack

An interactive visualizer for the stack data structure, built around the classic stack-of-plates analogy. Push a plate onto the top, pop the top plate off, and peek at what's next.

**Live site:** https://stack-of-plates.vercel.app/

## What it does

- Starts with a small stack of three plates.
- **Push plate** adds a numbered plate to the top with a drop animation.
- **Pop top** removes the top plate with a lift-off animation and offers undo.
- **Peek** highlights the top plate and shows its value without removing it.
- **Clear stack** empties the stack and offers undo.
- Live stack stats show the top plate, size, and capacity.
- The operation log records every push, pop, peek, clear, and undo.
- Plates use a palette of ceramic colors so each value is easy to spot.
- Handles up to 12 plates and disables controls when the stack is empty or full.

## Stack behavior

The stack is stored bottom-to-top in a plain JavaScript array:

```js
const plates = [];
plates.push(newPlate);   // push
const top = plates[plates.length - 1]; // peek
const removed = plates.pop();          // pop
```

The implementation uses `push()`, `pop()`, and direct access to the last element. Every operation updates the visual stack, the state panel, the operation log, and an accessible live region.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `P` | Push a plate |
| `O` | Pop the top plate |
| `K` | Peek at the top plate |

Clear and undo are available through the on-screen buttons.

## Run locally

There is no build step or dependency install. Open `index.html` directly, or serve the folder:

```powershell
python -m http.server 8771
```

Then visit `http://localhost:8771`.

## Accessibility

- Full keyboard operation and visible focus styles.
- Screen-reader status announcements for stack changes and undo availability.
- Buttons expose their keyboard shortcuts with `aria-keyshortcuts`.
- The visual plate stack is decorative; the state panel and screen-reader summary provide the same information.
- Respects `prefers-reduced-motion`.
- Touch targets are at least 44px tall.

## Deployment

The site is static HTML, CSS, and JavaScript with no build step. It is hosted on Vercel at **https://stack-of-plates.vercel.app/**.

The Vercel project is connected to the GitHub repository, so pushes to `main` deploy to production automatically. To deploy manually:

```powershell
npx vercel --prod
```
