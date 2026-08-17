import type { Meta, StoryObj } from '@storybook/react';
import { expect } from 'storybook/test';
import { FillSwatch } from './FillSwatch';

const meta = {
  component: FillSwatch,
  tags: ['ai-generated', 'needs-work'],
} satisfies Meta<typeof FillSwatch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SolidColor: Story = {
  args: { 
    fill: { type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 1, visible: true },
    label: 'Red'
  },
  play: async ({ canvas }) => {
    // Assert render
    const button = canvas.getByRole('button');
    await expect(button).toBeVisible();
  },
};
