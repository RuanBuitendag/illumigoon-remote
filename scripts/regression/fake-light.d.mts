// The types of fake-light.mjs, for the Storybook stories that use it in the browser.
type Socket = {
  send(raw: string): void;
  close(options: { code: number }): Promise<void>;
  onMessage(listener: (raw: string) => void): void;
  onClose(listener: () => void): void;
};

type Options = {
  id: string;
  name: string;
  room?: string;
  isOn?: boolean;
  brightness?: number;
  hasWifi?: boolean;
  isMaster?: boolean;
  animation?: { type: string; params: unknown };
};

export class FakeLight {
  constructor(options: Options);
  attach(socket: Socket): void;
  stop(): void;
}
