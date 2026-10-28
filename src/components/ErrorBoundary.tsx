import { Component, type ReactNode } from 'react';
import { CircleAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

/** Catches render errors and failed chunk loads in the dashboard and shows a readable message. */
export class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: unknown }, { error: Error | null; key?: unknown }> {
  state: { error: Error | null; key?: unknown } = { error: null, key: undefined };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  static getDerivedStateFromProps(props: { resetKey?: unknown }, state: { error: Error | null; key?: unknown }) {
    // A new result clears an earlier error.
    if (props.resetKey !== state.key) return { error: null, key: props.resetKey };
    return null;
  }

  render() {
    if (!this.state.error) return this.props.children;
    const chunk = /dynamically imported module|Loading chunk|Importing a module script failed/i.test(this.state.error.message);
    return (
      <Alert variant="destructive" className="animate-fade">
        <CircleAlert aria-hidden="true" />
        <AlertTitle>{chunk ? 'Could not load the charts' : 'Something went wrong while drawing the charts'}</AlertTitle>
        <AlertDescription>
          <p className="text-foreground/85">
            {chunk ? 'Check your connection and reload the page.' : 'Try again, or try a different date range.'}
          </p>
        </AlertDescription>
      </Alert>
    );
  }
}
