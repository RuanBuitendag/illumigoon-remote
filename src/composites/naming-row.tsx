import { useState } from 'react';
import { TextField, TextKey } from '../design-system';

type NamingRowProps = {
  label: string;
  onCancel: () => void;
  onKeep: (name: string) => void;
};

export function NamingRow({ label, onCancel, onKeep }: NamingRowProps) {
  const [name, setName] = useState('');
  return (
    <div className="naming-row">
      <TextField size="small" label={label} placeholder="Name" value={name} onChange={setName} />
      <TextKey isQuiet onClick={onCancel}>
        CANCEL
      </TextKey>
      <TextKey disabled={!name.trim()} onClick={() => onKeep(name.trim())}>
        KEEP
      </TextKey>
    </div>
  );
}
