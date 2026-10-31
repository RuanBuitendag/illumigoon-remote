type TextFieldProps = {
  label: string;
  size: 'title' | 'large' | 'medium' | 'small';
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
    />
  );
}
