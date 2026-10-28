const links = [
  { href: 'https://github.com/Shashank-Sund/stock-price-analysis-UI', label: 'Front-End Code' },
  { href: 'https://github.com/Shashank-Sund/docker-lambda-aws3', label: 'Back-End Code' },
];

export function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>A Shashank Sundararaman Production</p>
        <nav aria-label="Source code" className="flex gap-5">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-sm underline-offset-4 transition-colors outline-none hover:text-foreground hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {l.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
