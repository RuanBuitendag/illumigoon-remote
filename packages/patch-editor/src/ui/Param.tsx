/** One parameter wired to its path, as a knob or a fader. */

import type { ParamSpec } from '../domain/catalog';
import { srcBipolarOf } from '../domain/patch';
import { Knob, type KnobMod } from './Knob';
import { Fader } from './Fader';
import { sample } from './live';
import type { Ctl } from './ctl';
import { exposeProps } from './Surface';

/**
 * A knob wired to a path: value in, drag out, a drop target while binding, and one ring per
 * row driving it — draggable for depth, with the polarity on its chip.
 *
 * THE PATH IS THE ONLY THING THAT VARIES. A layer parameter (`L0.emitter.centre`) and a
 * modulator's own (`M3.rate`) differ in how they SPELL an address and in nothing else:
 * `rowsFor`, `specForPath`, `setParam` and the drop handler all branch on the string, so a
 * knob does not have to know which kind it is drawing. `dock.tsx` used to have a second,
 * thinner one for modulators — no rings, no `data-path`, so a modulator's parameters could
 * neither show the modulation on them nor accept any (LIFE-757).
 *
 * That thin one is also where a modulator knob last went wrong, and the reason is worth
 * keeping: `resolvePath` once refused anything not starting with `L`, so these dragged
 * locally and landed a whole `light_set_state` on pointer-up. LIFE-659 gave the address
 * space its `M<i>.<key>` case and the tool never caught up, which made every knob release
 * a 2 KB document — about a hundred of those is enough to starve the Device and drop the
 * socket (LIFE-727). One component means there is no second one to forget again.
 */
export function Param({ ctl, path, spec, value, width, bare }: {
  ctl: Ctl; path: string; spec: ParamSpec; value: number; width?: number; bare?: boolean;
}) {
  const rows = ctl.rowsFor(path);
  const mods = modsFor(ctl, rows);
  return (
    // data-path is what the drag hit-tests against; see Ctl.drag. data-expose is what a
    // right-click reads to offer it to the user surface -- the same address, asked differently.
    <div data-path={path} {...exposeProps(ctl.patch, path)}>
      <Knob
        spec={spec}
        value={value}
        width={width}
        bare={bare}
        onChange={v => ctl.setParam(path, v)}
        onCommit={ctl.commit}
        mods={mods}
        onDepth={ctl.setDepth}
        onDepthCommit={ctl.pushDoc}
        onPolarity={ctl.togglePolarity}
        onUnbind={ctl.removeRow}
        armed={ctl.drag !== null}
        hot={ctl.hot === path}
        // The reverse of `hot`: not "the pointer is over this knob" but "the slot under the
        // pointer drives this knob". Derived from the rows this knob already holds, so
        // there is nothing to keep in step with the matrix -- it IS the matrix.
        lit={ctl.trace !== null && rows.some(r => r.src === ctl.trace)}
      />
    </div>
  );
}

/** The rows into a parameter, as the rings a knob draws or the bands a fader draws. */
function modsFor(ctl: Ctl, rows: ReturnType<Ctl['rowsFor']>): KnobMod[] {
  return rows.map(r => ({
    id: r.id,
    src: r.src,
    depth: r.depth,
    bipolar: r.bipolar,
    srcBipolar: srcBipolarOf(ctl.patch, r.src),
    inert: r.bypass || ctl.patch.modulators.find(m => m.slot === r.src)?.bypass,
    liveAt: (t: number) => {
      if (r.bypass) return undefined;
      const v = sample(ctl.patch.modulators.find(m => m.slot === r.src), t);
      // The ring spans the reach either way; a unipolar row has already been remapped.
      return v;
    },
  }));
}

/**
 * `Param` laid flat, for a place too short for a dial: the same address, the same drop target,
 * the same rows. See `Fader` for what a bar leaves out and why.
 */
export function ParamFader({ ctl, path, spec, value }: {
  ctl: Ctl; path: string; spec: ParamSpec; value: number;
}) {
  const rows = ctl.rowsFor(path);
  return (
    // data-path is what the drag hit-tests against; see Ctl.drag.
    <div
      data-path={path}
      {...exposeProps(ctl.patch, path)}
      className="grow"
      style={{ display: 'flex', minWidth: 0 }}
    >
      <Fader
        spec={spec}
        value={value}
        onChange={v => ctl.setParam(path, v)}
        onCommit={ctl.commit}
        mods={modsFor(ctl, rows)}
        armed={ctl.drag !== null}
        hot={ctl.hot === path}
        lit={ctl.trace !== null && rows.some(r => r.src === ctl.trace)}
      />
    </div>
  )
}

// ============================================================== layer stack
