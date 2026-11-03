export function SoundMark() {
  return (
    <span className="sound-mark" role="img" aria-label="Moves to music">
      <i />
      <i />
      <i />
    </span>
  );
}

export function StatusMark({ state }: { state: 'on' | 'off' | 'silent' }) {
  return <i className="status-mark" data-state={state} />;
}
