import { Menu } from '@base-ui/react/menu';
import { Children, useState, type ReactNode } from 'react';
import { Icon } from './icons';
import { TextKey } from './keys';

export type FoldedKey = {
  name: string;
  // A destructive key asks for a second tap before it acts, unless what it does has undo (D101).
  isDestructive?: boolean;
  hasUndo?: boolean;
  disabled?: boolean;
  onSelect: () => void;
};

// The most keys a group shows. A group with more shows the first ones and puts the rest in a menu (D102).
const MOST_KEYS = 3;
const AGAIN = 'TAP AGAIN';

// Keys that act on the same thing. `children` are the keys that always show, most used first. `more` are the
// keys used less often: they show as keys while the group has room, and fold into a MORE menu when it has not.
export function KeyGroup({ children, more = [] }: { children: ReactNode; more?: FoldedKey[] }) {
  const shown = Children.toArray(children);
  if (shown.length + more.length <= MOST_KEYS) {
    return (
      <>
        {shown}
        {more.map((key) =>
          key.isDestructive && !key.hasUndo ? (
            <ArmedKey key={key.name} name={key.name} disabled={key.disabled} onSelect={key.onSelect} />
          ) : (
            <TextKey
              key={key.name}
              rank={key.isDestructive ? 'destructive' : undefined}
              disabled={key.disabled}
              onClick={key.onSelect}
            >
              {key.name}
            </TextKey>
          ),
        )}
      </>
    );
  }
  return (
    <>
      {shown}
      <MoreMenu keys={more} />
    </>
  );
}

// A destructive key that acts on its second tap, and says so after the first.
export function ArmedKey({ name, disabled, onSelect }: Omit<FoldedKey, 'isDestructive' | 'hasUndo'>) {
  const [isArmed, setArmed] = useState(false);
  return (
    <TextKey
      rank="destructive"
      disabled={disabled}
      onClick={() => {
        if (isArmed) onSelect();
        setArmed(!isArmed);
      }}
    >
      {isArmed ? `${AGAIN} TO ${name}` : name}
    </TextKey>
  );
}

function MoreMenu({ keys }: { keys: FoldedKey[] }) {
  const [armed, setArmed] = useState<string | null>(null);
  return (
    <Menu.Root onOpenChange={() => setArmed(null)}>
      <Menu.Trigger className="text-key more-key" aria-label="More">
        <Icon.More c="currentColor" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner className="key-menu-place" side="bottom" align="end" sideOffset={4}>
          <Menu.Popup className="key-menu">
            {keys.map((key) => {
              const isArmed = armed === key.name;
              const asksTwice = key.isDestructive && !key.hasUndo;
              return (
                <Menu.Item
                  key={key.name}
                  className="key-menu-item"
                  data-destructive={key.isDestructive}
                  disabled={key.disabled}
                  closeOnClick={!asksTwice || isArmed}
                  onClick={() => {
                    if (asksTwice && !isArmed) return setArmed(key.name);
                    key.onSelect();
                  }}
                >
                  {isArmed ? `${AGAIN} TO ${key.name}` : key.name}
                </Menu.Item>
              );
            })}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
