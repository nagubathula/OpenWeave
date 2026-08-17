import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent } from 'storybook/test';
import SegmentedControl from './SegmentedControl';

const meta = {
  component: SegmentedControl,
  tags: ['ai-generated', 'needs-work'],
} satisfies Meta<typeof SegmentedControl>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { 
    label: 'View mode',
    value: 'design',
    options: [
      { value: 'design', label: 'Design' },
      { value: 'prototype', label: 'Prototype' },
    ],
    onChange: () => {} 
  },
  play: async ({ canvas, userEvent }) => {
    const prototypeBtn = canvas.getByRole('radio', { name: /prototype/i });
    await expect(prototypeBtn).toBeVisible();
    await userEvent.click(prototypeBtn);
  },
};
