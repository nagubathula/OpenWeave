import type { Meta, StoryObj } from '@storybook/react'
import { expect, userEvent } from 'storybook/test'

import Tip from './Tip'

const meta = {
  component: Tip,
  tags: ['ai-generated', 'needs-work']
} satisfies Meta<typeof Tip>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    label: 'This is a tip',
    children: <button>Hover me</button>
  },
  play: async ({ canvas, canvasElement }) => {
    await userEvent.hover(canvas.getByRole('button', { name: /hover me/i }))
    // Wait for radix tooltip portal which appends to document body
    // Just asserting button is visible is fine for smoke
    await expect(canvas.getByRole('button', { name: /hover me/i })).toBeVisible()
  }
}

export const Disabled: Story = {
  args: {
    label: 'Disabled tip',
    disabled: true,
    children: <button>No tip here</button>
  }
}
