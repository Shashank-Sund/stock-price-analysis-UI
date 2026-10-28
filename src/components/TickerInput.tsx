import { useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { fieldClasses } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { addTickers, isValidTicker, splitTickers } from '@/lib/tickers';

interface TickerInputProps {
  id: string;
  tickers: string[];
  onChange: (tickers: string[]) => void;
  draft: string;
  onDraftChange: (draft: string) => void;
  invalid?: boolean;
  describedBy?: string;
  disabled?: boolean;
}

export function TickerInput({
  id,
  tickers,
  onChange,
  draft,
  onDraftChange,
  invalid,
  describedBy,
  disabled,
}: TickerInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  const commit = (raw: string) => {
    const parts = splitTickers(raw);
    if (parts.length) onChange(addTickers(tickers, parts));
    onDraftChange('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && draft.trim()) {
      e.preventDefault();
      commit(draft);
    } else if (e.key === ',') {
      e.preventDefault();
    } else if (e.key === 'Backspace' && draft === '' && tickers.length > 0) {
      e.preventDefault();
      onChange(tickers.slice(0, -1));
    }
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    if (/[,\s]/.test(text.trim())) {
      e.preventDefault();
      commit(draft + text);
    }
  };

  const remove = (t: string) => {
    onChange(tickers.filter((x) => x !== t));
    inputRef.current?.focus();
  };

  return (
    <div
      className={cn(
        fieldClasses,
        'flex min-h-9 cursor-text flex-wrap items-center gap-1.5 px-1.5 py-1',
        focused && 'border-ring ring-[3px] ring-ring/40',
        invalid && 'border-destructive',
        invalid && focused && 'ring-destructive/20',
        disabled && 'cursor-not-allowed opacity-60',
      )}
      onClick={() => inputRef.current?.focus()}
    >
      <ul className="contents" aria-label="Selected tickers">
        {tickers.map((t) => {
          const ok = isValidTicker(t);
          return (
            <li
              key={t}
              className={cn(
                'inline-flex h-6 items-center gap-0.5 rounded-md border pl-2 pr-0.5 font-mono text-xs font-medium',
                ok
                  ? 'border-transparent bg-secondary text-secondary-foreground'
                  : 'border-destructive/40 bg-destructive/10 text-destructive',
              )}
            >
              {t}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  remove(t);
                }}
                disabled={disabled}
                className="inline-flex size-5 items-center justify-center rounded-sm text-muted-foreground transition-colors outline-none hover:bg-background/80 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
                aria-label={`Remove ${t}`}
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
      <input
        ref={inputRef}
        id={id}
        value={draft}
        onChange={(e) => onDraftChange(e.target.value.toUpperCase())}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          if (draft.trim()) commit(draft);
        }}
        placeholder={tickers.length ? 'Add another' : 'AAPL, MSFT'}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        disabled={disabled}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        enterKeyHint="done"
        className="h-6 min-w-[6rem] flex-1 bg-transparent px-1.5 font-mono text-base uppercase outline-none placeholder:font-sans placeholder:normal-case placeholder:text-muted-foreground md:text-sm"
      />
    </div>
  );
}
