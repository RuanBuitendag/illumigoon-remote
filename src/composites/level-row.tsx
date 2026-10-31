import { Fader, PowerKey } from '../design-system';

type LevelRowProps = {
  label: string;
  isOn: boolean;
  level: number;
  disabled?: boolean;
  onPower: (isOn: boolean) => void;
  onLevel: (level: number) => void;
};

export function LevelRow({ label, isOn, level, disabled, onPower, onLevel }: LevelRowProps) {
  return (
    <div className="level-row">
      <PowerKey label={`${label} power`} isOn={isOn} disabled={disabled} onChange={onPower} />
      <Fader
        label={`${label} brightness`}
        value={level}
        min={0}
        max={1}
        step={0.01}
        disabled={disabled}
        isLit={isOn}
        onChange={onLevel}
      />
      <span className="level-value value-text">{Math.round(level * 100)}</span>
    </div>
  );
}
