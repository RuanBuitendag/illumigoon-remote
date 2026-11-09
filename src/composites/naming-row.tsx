import { useState } from 'react';
import { TextField, TextKey } from '../design-system';

type NamingRowProps = {
  label: string;
  // A name to start from, which the person can keep or change.
  suggestion?: string;
  onCancel: () => void;
  onKeep: (name: string) => void;
};

export function NamingRow({ label, suggestion = '', onCancel, onKeep }: NamingRowProps) {
  const [name, setName] = useState(suggestion);
  return (
    <div className="naming-row">
      <TextField size="small" label={label} placeholder="Name" value={name} onChange={setName} />
      <TextKey isQuiet onClick={onCancel}>
        CANCEL
      </TextKey>
      <TextKey rank="primary" disabled={!name.trim()} onClick={() => onKeep(name.trim())}>
        KEEP
      </TextKey>
    </div>
  );
}
