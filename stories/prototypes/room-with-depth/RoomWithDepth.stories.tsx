import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { userEvent, within } from 'storybook/test';
import { DepthLight, type DepthEffects } from '../../../src/design-system';
import { App } from '../../../src/domain';
import { openScreen } from '../../screens/open-screen';

// Prototype (LIFE-2013): the real room, with four ways to give it depth from the strips' own light. Turn each on
// and off in Controls, on the phone and the laptop size. The effects are the design system's DepthLight, which the
// app also has behind Settings > DEPTH (LIFE-2015).

const withDepth: Decorator = (Story, { args }) => (
  <>
    <DepthLight {...(args as DepthEffects)} />
    <Story />
  </>
);

export default {
  title: 'Prototypes/Room with depth',
  component: App,
  tags: ['!autodocs'],
  decorators: [withDepth],
  args: { glow: true, glass: true, litKeys: true, grain: true },
  argTypes: {
    glow: { name: '1. The look lights the page', control: 'boolean' },
    glass: { name: '2. Glass sheets and bars', control: 'boolean' },
    litKeys: { name: '3. Lit keys', control: 'boolean' },
    grain: { name: '4. Grain and falloff', control: 'boolean' },
  },
} satisfies Meta;

type Story = StoryObj;

export const Bedroom: Story = { beforeEach: () => openScreen({ roomId: 'Bedroom' }) };

export const Lounge: Story = { beforeEach: () => openScreen({ roomId: 'Lounge' }) };

export const Rooms: Story = { beforeEach: () => openScreen({}) };

// The save scene sheet over the lit room shows the glass.
export const SheetOverTheRoom: Story = {
  name: 'Sheet over the room',
  beforeEach: () => openScreen({ roomId: 'Bedroom' }),
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(await page.findByRole('button', { name: '+ SCENE' }));
  },
};
