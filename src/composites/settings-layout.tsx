import type { ReactNode } from 'react';
import { ChevronMark, Eyebrow, Press } from '../design-system';

export function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="tab-page settings-page">
      <h1 className="tab-title">Settings</h1>
      {children}
    </div>
  );
}

export function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="settings-group">
      <Eyebrow>{title}</Eyebrow>
      <div className="settings-box">{children}</div>
    </section>
  );
}

type SettingRowProps = { label: string; note?: string; onOpen: () => void };

export function SettingRow({ label, note, onOpen }: SettingRowProps) {
  return (
    <Press className="setting-row" onClick={onOpen}>
      <span className="setting-text">
        <span className="setting-label">{label}</span>
        {note && <span className="setting-note">{note}</span>}
      </span>
      <ChevronMark direction="right" />
    </Press>
  );
}

export function SettingValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="setting-row">
      <span className="setting-label">{label}</span>
      <span className="setting-value">{value}</span>
    </div>
  );
}
