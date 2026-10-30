import { Switch } from '@base-ui/react/switch';

type PowerSwitchProps = {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
};

export function PowerSwitch({ label, checked, disabled, onChange }: PowerSwitchProps) {
  return (
    <Switch.Root
      className="power-switch"
      aria-label={label}
      checked={checked}
      disabled={disabled}
      onCheckedChange={(next) => onChange(next)}
    >
      <Switch.Thumb className="power-switch-thumb" />
    </Switch.Root>
  );
}
