import { useState } from 'react';
import { PageFrame, PageHint, PageSection } from '../../composites';
import { ActionKey, Eyebrow, KeyRow, TextField, TextKey } from '../../design-system';
import { changeLightWifi, resetLight, restartLight, type Light } from '../store/fleet-store';
import { closePage, useBackLabel } from '../store/navigation-store';
import type { Room } from '../store/rooms';
import { showNotice } from '../store/undo';

type WifiFormProps = { light: Light; onDone: () => void };

function WifiForm({ light, onDone }: WifiFormProps) {
  const [wifiName, setWifiName] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');

  const send = () => {
    changeLightWifi(light, wifiName.trim(), wifiPassword);
    showNotice(`Sent to ${light.name}. If the Wi-Fi details are wrong, its Modulight Wi-Fi comes back.`);
    onDone();
  };

  return (
    <>
      <PageHint>The light joins this Wi-Fi within a minute. Your phone must be on the same Wi-Fi to see it.</PageHint>
      <TextField
        size="large"
        label={`New Wi-Fi name for ${light.name}`}
        placeholder="Wi-Fi name"
        value={wifiName}
        onChange={setWifiName}
      />
      <TextField
        size="large"
        type="password"
        label={`New Wi-Fi password for ${light.name}`}
        placeholder="Password, if it changed"
        value={wifiPassword}
        onChange={setWifiPassword}
      />
      <ActionKey disabled={!wifiName.trim()} onClick={send}>
        Change Wi-Fi
      </ActionKey>
    </>
  );
}

function ResetConfirm({ light, onCancel }: { light: Light; onCancel: () => void }) {
  return (
    <>
      <PageHint>Reset wipes the name, room and Wi-Fi of this light. It then waits to be set up again.</PageHint>
      <KeyRow>
        <TextKey onClick={() => resetLight(light)}>{`RESET ${light.name.toUpperCase()}`}</TextKey>
        <TextKey isQuiet onClick={onCancel}>
          CANCEL
        </TextKey>
      </KeyRow>
    </>
  );
}

type OpenPart = 'none' | 'wifi' | 'reset';

function LightSetup({ light }: { light: Light }) {
  const [openPart, setOpenPart] = useState<OpenPart>('none');
  const close = () => setOpenPart('none');

  const restart = () => {
    restartLight(light);
    showNotice(`${light.name} is restarting.`);
  };

  if (!light.isOnline) {
    return (
      <PageSection>
        <Eyebrow>{light.name.toUpperCase()}</Eyebrow>
        <PageHint>Not answering.</PageHint>
      </PageSection>
    );
  }
  return (
    <PageSection>
      <Eyebrow>{light.name.toUpperCase()}</Eyebrow>
      {openPart === 'none' && (
        <KeyRow>
          <TextKey onClick={restart}>RESTART</TextKey>
          <TextKey onClick={() => setOpenPart('wifi')}>WI-FI</TextKey>
          <TextKey isQuiet onClick={() => setOpenPart('reset')}>
            RESET
          </TextKey>
        </KeyRow>
      )}
      {openPart === 'wifi' && <WifiForm light={light} onDone={close} />}
      {openPart === 'reset' && <ResetConfirm light={light} onCancel={close} />}
    </PageSection>
  );
}

export function LightSetupPage({ room }: { room: Room }) {
  return (
    <PageFrame title="Light setup" backLabel={useBackLabel(room)} onBack={closePage}>
      {room.lights.map((light) => (
        <LightSetup key={light.address} light={light} />
      ))}
    </PageFrame>
  );
}
