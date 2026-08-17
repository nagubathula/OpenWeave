import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent } from 'storybook/test';
import { AppInput } from './AppInput';

const meta = {
  component: AppInput,
  tags: ['ai-generated', 'needs-work'],
} satisfies Meta<typeof AppInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { placeholder: 'Enter value...' },
  play: async ({ canvas }) => {
    const input = canvas.getByPlaceholderText(/enter value/i);
    await expect(input).toBeVisible();
    await userEvent.type(input, 'Hello', { delay: 10 });
    await expect(input).toHaveValue('Hello');
  },
};

export const Disabled: Story = {
  args: { placeholder: 'Disabled', disabled: true },
};
