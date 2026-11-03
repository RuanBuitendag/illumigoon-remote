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
