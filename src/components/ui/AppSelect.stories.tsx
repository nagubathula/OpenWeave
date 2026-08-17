import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent } from 'storybook/test';
import { AppSelect } from './AppSelect';

const meta = {
  component: AppSelect,
  tags: ['ai-generated', 'needs-work'],
} satisfies Meta<typeof AppSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { 
    placeholder: 'Select an option',
    options: [
      { value: '1', label: 'Option 1' },
      { value: '2', label: 'Option 2' },
      { value: '3', label: 'Option 3' },
    ]
  },
  play: async ({ canvas, userEvent, canvasElement }) => {
    const trigger = canvas.getByRole('combobox');
    await expect(trigger).toBeVisible();
    await userEvent.click(trigger);
    
    // Radix portals to document.body, not canvasElement.
    const body = canvasElement.ownerDocument.body;
    const option = body.querySelector('[role="option"]');
    await expect(option).not.toBeNull();
  },
};
