/**
 * What a light older than this editor looks like, instead of a blank page.
 *
 * The editor draws every control from the node catalog the light publishes, and a light one
 * build behind can be missing a node the editor now assumes. That used to throw during
 * render — `nodeById('layer')!.params[0]` against firmware from before the `layer` node was
 * added to `light_limits_res` — and React's answer to a throw during render is to unmount
 * the whole tree. A white page, a stack trace in the console nobody had open, and no way to
 * tell which light or which build was at fault. See LIFE-702.
 *
 * A class component because there is still no hook for this: `getDerivedStateFromError` and
 * `componentDidCatch` have no function equivalent, and the one place in this codebase that
 * needs a class is the one React has never given a hook.
 *
 * IT WRAPS THE BODY, NOT THE WHOLE EDITOR. The app's Edit header stays outside it, so Back
 * still works, and this says the light's name and firmware version, which are the facts somebody
 * needs to act on it.
 *
 * It does not offer to retry. Nothing about the light changes by rendering again, so a retry
 * button would either do nothing or loop; the honest options are to go and flash it, or to
 * edit a different one.
 */

import { Component, type ReactNode } from 'react';
import { MissingNode } from '../domain/catalog';
import { Lab, Mono } from './bits';

interface Props {
  children: ReactNode;
  /** The light this is about, as Edit names it. */
  label: string;
  /** What it says it is running, when it has said. */
  firmware?: string;
  /** Back to the connect screen. */
  onLeave(): void;
}

interface State {
  error: Error | null;
}

export class Boundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    // The stack is the only thing that says WHERE, and the screen below deliberately does
    // not show it -- a stack trace is not something a person can act on, and the message is.
    console.error('[editor] render failed', error, info);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const missing = error instanceof MissingNode;
    const who = this.props.label || 'This light';

    return (
      <div className="await-catalog">
        <div className="catalog-fail">
          <Lab className="head">{who} is running a build this editor cannot draw</Lab>
          <p>
            {missing
              // Named, because "which build publishes it" is the actionable half and the
              // node id is what somebody greps for.
              ? `Its catalog is missing ${(error as MissingNode).param
                  ? `'${(error as MissingNode).param}' on the '${(error as MissingNode).node}' node`
                  : `the '${(error as MissingNode).node}' node`}, which this editor needs to `
                + 'draw its controls. Flash a current build onto it.'
              : error.message}
          </p>
          {this.props.firmware && <Mono className="dim sm">fw {this.props.firmware}</Mono>}
          <button className="pill raise" onClick={this.props.onLeave}>Pick another device</button>
        </div>
      </div>
    );
  }
}
