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
 * still works, and this says the light's name and software version, which are the facts somebody
 * needs to act on it. The missing node goes to the console, never to the screen.
 *
 * It does not offer to retry. Nothing about the light changes by rendering again, so a retry
 * button would either do nothing or loop; the honest options are to go and flash it, or to
 * edit a different one.
 */

import { Component, type ReactNode } from 'react';
import { MissingNode } from '../domain/catalog';
import { Lab, Mono } from './bits';
import { Pill } from './controls';

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

    // The words follow docs/design-system/voice.md: what happened and what to do, no ids or codes (BR-4, BR-6).
    return (
      <div className="await-catalog">
        <div className="catalog-fail">
          <Lab className="head">{missing ? `${who} has light software Edit cannot draw` : 'Edit could not draw this look'}</Lab>
          <p>{missing ? 'Update the light software, then open Edit again.' : 'Go back, then open Edit again.'}</p>
          {this.props.firmware && <Mono className="dim sm">Light software {this.props.firmware}</Mono>}
          <Pill className="raise" onClick={this.props.onLeave}>BACK</Pill>
        </div>
      </div>
    );
  }
}
