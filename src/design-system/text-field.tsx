import { Icon } from './icons';
import { Press } from './keys';

type TextFieldProps = {
  label: string;
  size: 'large' | 'small';
  type?: 'text' | 'password' | 'time';
  placeholder?: string;
  maxLength?: number;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onLeave?: (value: string) => void;
};

export function TextField({ label, size, type = 'text', onChange, onLeave, ...input }: TextFieldProps) {
  return (
    <input
      {...input}
      className={`text-field text-field-${size}`}
      type={type}
      aria-label={label}
      onChange={(event) => onChange?.(event.target.value)}
      onBlur={(event) => onLeave?.(event.target.value)}
      // Return keeps a field that saves when it is left, as a tap elsewhere does.
      onKeyDown={(event) => {
        if (onLeave && event.key === 'Enter') event.currentTarget.blur();
      }}
    />
  );
}

type TextAreaProps = { label: string; placeholder?: string; value: string; onChange: (value: string) => void };

export function TextArea({ label, onChange, ...input }: TextAreaProps) {
  return (
    <textarea
      {...input}
      className="text-area"
      aria-label={label}
      spellCheck={false}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

type SearchFieldProps = { label: string; value: string; onChange: (value: string) => void };

// A field that filters a list as you type: an edge, a magnifier at the start, and an X that clears it.
export function SearchField({ label, value, onChange }: SearchFieldProps) {
  return (
    <div className="search-field" role="search">
      <Icon.Search />
      <input
        className="search-field-input"
        type="search"
        aria-label={label}
        placeholder={label}
        enterKeyHint="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {value && (
        <Press className="search-field-clear" label="Clear the search" onClick={() => onChange('')}>
          <Icon.X c="var(--text-3)" />
        </Press>
      )}
    </div>
  );
}
