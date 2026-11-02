import type { ReactNode } from 'react';
import { ChevronMark, ColourFill, Press, TextKey, tintStyle } from '../design-system';

type LightCardProps = {
  name: string;
  subtitle: string;
  tint?: string;
  power: ReactNode;
  strip: ReactNode;
  level: ReactNode;
  colours: ReactNode;
  onClose: () => void;
  onChangeLook: () => void;
  onControls: () => void;
};

export function LightCard(card: LightCardProps) {
  const { name, subtitle, tint, power, strip, level, colours, onClose, onChangeLook, onControls } = card;
  return (
    <>
      <Press className="light-card-scrim" label="Close" onClick={onClose}>
        {null}
      </Press>
      <section className="light-card" role="dialog" aria-label={name} style={tintStyle(tint)}>
        <div className="light-card-head">
          {power}
          <span className="light-text">
            <span className="light-card-name">{name}</span>
            <span className="light-note">{subtitle}</span>
          </span>
          <TextKey onClick={onClose}>DONE</TextKey>
        </div>
        {strip}
        {level}
        <div className="light-card-colours">{colours}</div>
        <div className="light-card-keys">
          <TextKey onClick={onChangeLook}>
            CHANGE LOOK
            <ChevronMark direction="right" />
          </TextKey>
          <TextKey isQuiet onClick={onControls}>
            ALL CONTROLS
          </TextKey>
        </div>
      </section>
    </>
  );
}

type ColourTileProps = { name: string; paint: string; isPicked: boolean; onPick: () => void };

export function ColourTiles({ kind, children }: { kind: 'solids' | 'sets'; children: ReactNode }) {
  return (
    <div className="colour-tiles" data-kind={kind}>
      {children}
    </div>
  );
}

export function SolidTile({ name, paint, isPicked, onPick }: ColourTileProps) {
  return (
    <Press className="colour-tile" label={name} isPressed={isPicked} onClick={onPick}>
      <ColourFill className="colour-tile-solid" paint={paint} />
      <i className="colour-tile-mark" />
    </Press>
  );
}

export function SetTile({ name, paint, isPicked, onPick }: ColourTileProps) {
  return (
    <Press className="colour-tile" isPressed={isPicked} onClick={onPick}>
      <ColourFill className="colour-tile-set" paint={paint} />
      <span className="colour-tile-name">
        <i className="colour-tile-mark" />
        {name}
      </span>
    </Press>
  );
}

export function NoColours({ children }: { children: ReactNode }) {
  return <p className="no-colours">{children}</p>;
}
