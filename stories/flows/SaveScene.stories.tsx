import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fireEvent, userEvent, waitFor, within } from 'storybook/test';
import { App } from '../../src/domain';
import { library, useLibrary } from '../../src/domain/store/library-store';
import { openScreen } from '../screens/open-screen';

// Saving a scene from the Bedroom, one story per step (LIFE-2011). Each step plays the steps before it, so the
// Interactions panel walks through the whole flow. The library starts with no scenes, so nothing saved on an
// earlier visit shows.

async function emptyLibrary() {
  const { listScenes, deleteScene } = await library();
  for (const { file } of await listScenes()) await deleteScene(file);
  useLibrary.setState({ scenes: [] });
}

export default {
  title: 'Flows/Save scene',
  component: App,
  tags: ['!autodocs'],
  beforeEach: async () => {
    await emptyLibrary();
    openScreen({ roomId: 'Bedroom' });
  },
} satisfies Meta;

type Story = StoryObj;
type Context = Parameters<NonNullable<Story['play']>>[0];

// The sheet sits over the page, outside the story's own root.
const page = ({ canvasElement }: Context) => within(canvasElement.ownerDocument.body);

export const OpenTheSheet: Story = {
  name: '1. Open the sheet',
  play: async (context) => {
    await userEvent.click(await page(context).findByRole('button', { name: '+ SCENE' }));
    await page(context).findByRole('dialog', { name: 'Save scene' });
  },
};

export const ChooseTheWholeHouse: Story = {
  name: '2. Choose the whole house',
  play: async (context) => {
    await OpenTheSheet.play?.(context);
    await userEvent.click(page(context).getByRole('button', { name: 'Whole house' }));
  },
};

// Scripted typing changes what the field shows but never reaches the app here, so the name goes in as one change.
export const NameIt: Story = {
  name: '3. Name it',
  play: async (context) => {
    await ChooseTheWholeHouse.play?.(context);
    const field = page(context).getByRole('textbox', { name: 'Scene name' });
    fireEvent.change(field, { target: { value: 'Evening' } });
    await expect(page(context).getByRole('button', { name: 'SAVE' })).toBeEnabled();
  },
};

export const Saved: Story = {
  name: '4. Saved',
  play: async (context) => {
    await NameIt.play?.(context);
    await userEvent.click(page(context).getByRole('button', { name: 'SAVE' }));
    await waitFor(() => expect(page(context).queryByRole('dialog', { name: 'Save scene' })).toBeNull(), {
      timeout: 5000,
    });
    // A scene of the whole house is kept on Looks, not with one room.
    const looksKeys = page(context).getAllByRole('button', { name: 'LOOKS' });
    await userEvent.click(looksKeys[looksKeys.length - 1] as HTMLElement);
    await page(context).findByText('Evening');
  },
};
