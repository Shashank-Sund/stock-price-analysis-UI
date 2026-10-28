# Design notes

A short record of the design decisions behind the React front end and the public sources they draw on.

## Principles

- **Content first.** The charts are the product. Chrome is quiet: neutral zinc surfaces, one accent color, thin borders, small shadows.
- **One accent.** A violet primary (a nod to the original site's `#553c9a`) is used only for the Analyze button, the logo tile, focus rings and the active preset. Everything else is grayscale, so the matplotlib colors in the charts are never competing with the UI.
- **Spacing scale.** Tailwind's 4 px base scale. Cards use 20 to 24 px padding, form controls are 36 px tall, gaps between controls are 12 to 16 px, and sections are 24 px apart. Page width caps at 72rem (`max-w-6xl`) with 16 px gutters on phones.
- **Typography.** The system UI font stack (no web font download). Sizes: 18 px app name, 16 px section titles, 14 px body and labels, 13 px helper text. Tickers use the monospace stack so chips line up. Dates and timers use `tabular-nums` so they do not jitter.
- **Cards and grid.** A single input card, then a results grid: one column on phones, two columns from 1024 px. When the chart count is odd (5 for a single ticker, 1 for several tickers) the first chart spans both columns, so there is never an orphan in the last row.
- **Figures.** The backend returns white matplotlib PNGs in mixed aspect ratios (10x6, 8x8, 12x6 inches). Each sits in a fixed aspect frame (`5/3`, or `2/1` for the wide lead chart) with `object-contain` on a white panel. In dark mode the panel stays white so the figure reads as a printed page with no two-tone letterboxing.
- **No layout shift.** Skeleton cards use the same header height and figure aspect as real cards, and the skeleton count matches what the backend will return (5 or 1). The Analyze button has a minimum width so the "Analyzing 12s" label does not resize it.
- **Loading.** The button is disabled with a spinner and an elapsed seconds counter until the request settles (success, error or the 35 s client timeout). A line above the skeletons explains that the request can take up to 30 seconds.
- **Errors.** One destructive Alert with a plain message and a Try again button. The message comes from the backend's `eda-error` div, the old crash JSON, the HTTP status, a network failure or the timeout.
- **Motion.** Small entrance fades (160 to 260 ms) for cards, dialogs and tooltips, defined inside `@media (prefers-reduced-motion: no-preference)`. Skeleton pulse and the spinner use Tailwind's `motion-safe:` variant, so with reduced motion they become a static fill and a static icon.
- **Accessibility.** Labels on every control, `aria-invalid` and `aria-describedby` on fields with errors, `role="alert"` for failures, a polite live region that announces "5 charts ready", `aria-busy` on the results region while loading, `aria-pressed` on presets, a skip link, visible 3 px focus rings, and keyboard support in the full screen dialog (Escape closes, arrow keys move between charts). Skeleton shapes are `aria-hidden`. Text colors meet WCAG AA on both themes (computed from the OKLCH tokens: muted text 6.0:1 on white and 7.3:1 on the dark card, button text 7.0:1 light and 7.7:1 dark, error text 5.4:1 light and 6.7:1 dark).
- **Dark mode.** Class based (`.dark` on `<html>`). The default follows `prefers-color-scheme`; an explicit toggle is saved in localStorage (inside try/catch) and an inline script applies it before first paint to avoid a flash. Native date pickers follow the theme through `color-scheme`.
- **Security.** The server's HTML is parsed with `DOMParser` and only two things are read from it: `<img>` elements whose `src` is a well formed `data:image/png;base64,` URL (with their `alt`), and the text of `.eda-error`. Nothing from the server is ever injected with `innerHTML`.

## Sources and licenses

| Source | What was borrowed | License |
| --- | --- | --- |
| [shadcn/ui](https://github.com/shadcn-ui/ui) | Component structure and class recipes for Button, Card, Input, Label, Badge, Alert, Skeleton, Dialog and Tooltip; the CSS variable token naming (`--background`, `--primary`, `--muted-foreground`, and so on) and the neutral zinc palette | MIT |
| [Radix UI Primitives](https://github.com/radix-ui/primitives) | Dialog (focus trap, Escape, scroll lock) and Tooltip behavior, used as npm dependencies | MIT |
| [Tailwind CSS](https://github.com/tailwindlabs/tailwindcss) | Utility classes, spacing scale, `@theme` tokens, `motion-safe` variant | MIT |
| [Lucide](https://github.com/lucide-icons/lucide) | Icons via `lucide-react` | ISC |
| [Tremor](https://github.com/tremorlabs/tremor) | Pattern reference only (no code): dashboard card headers with a title and right aligned actions, restrained gray surfaces, chart first layouts | Apache 2.0 |
| [class-variance-authority](https://github.com/joe-bell/cva), [clsx](https://github.com/lukeed/clsx), [tailwind-merge](https://github.com/dcastil/tailwind-merge) | Variant and class name helpers | Apache 2.0, MIT, MIT |
| [Adrian Roselli, "More Accessible Skeletons"](https://adrianroselli.com/2020/11/more-accessible-skeletons.html) | Hide skeleton shapes from assistive tech, announce state on the container with `aria-busy` and a live region | Article (ideas only) |
| [Toyota Europe design playbook, Skeleton](https://dx-playbook-prev.toyota-europe.com/cds/components/skeleton/) | Static fill when reduced motion is requested (WCAG 2.2.2 Pause, Stop, Hide) | Article (ideas only) |
| Databricks app-templates (`appkit-*` clients) | Looked at for overall feel only (React 19, Vite, Tailwind v4, shadcn style). No code was copied: that repository's license limits use to the Databricks platform. | Databricks License |

The mock API's chart images are synthetic matplotlib plots generated from random walk data, not real market data.
