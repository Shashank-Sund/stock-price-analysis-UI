import { ArrowRight } from 'lucide-react';

const FRONT = [
  ['React 19 and TypeScript', 'built with Vite'],
  ['Tailwind CSS and Radix UI', 'shadcn/ui style components, light and dark themes'],
  ['Recharts', 'through shadcn charts, for returns, risk, seasonality and comparisons'],
  ['TradingView Lightweight Charts', 'for the zoomable price and volume chart'],
] as const;

const BACK = [
  ['Python on AWS Lambda', 'packaged as a Docker container image'],
  ['pandas and yfinance', 'download prices and compute every statistic'],
  ['API Gateway', 'receives the request and returns JSON'],
  ['S3 and CloudFront', 'serve this site; Terraform describes the infrastructure'],
] as const;

const FLOW = ['Your browser', 'API Gateway', 'Lambda (pandas, yfinance)', 'JSON', 'Charts drawn in the browser'];

function List({ title, items }: { title: string; items: readonly (readonly [string, string])[] }) {
  return (
    <div className="min-w-0">
      <h3 className="text-[13px] font-medium text-foreground">{title}</h3>
      <ul className="mt-2 flex flex-col gap-1.5 text-[13px] leading-snug">
        {items.map(([name, what]) => (
          <li key={name}>
            <span className="text-foreground">{name}</span>
            <span className="text-muted-foreground">: {what}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A short, factual note on the stack. */
export function HowItsBuilt() {
  return (
    <section aria-labelledby="how-heading" className="rounded-xl border border-dashed px-5 py-5 sm:px-6">
      <h2 id="how-heading" className="text-sm font-semibold tracking-tight">
        How it's built
      </h2>
      <ol className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground" aria-label="Request flow">
        {FLOW.map((step, i) => (
          <li key={step} className="inline-flex items-center gap-1.5">
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-foreground/90">{step}</span>
            {i < FLOW.length - 1 && <ArrowRight className="size-3" aria-hidden="true" />}
          </li>
        ))}
      </ol>
      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        <List title="Front end" items={FRONT} />
        <List title="Back end" items={BACK} />
      </div>
    </section>
  );
}
