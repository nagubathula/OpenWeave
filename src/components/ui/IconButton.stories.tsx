import type { Meta, StoryObj } from '@storybook/react'
import { expect } from 'storybook/test'

import IconButton from './IconButton'

const meta = {
  component: IconButton,
  tags: ['ai-generated', 'needs-work']
} satisfies Meta<typeof IconButton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { children: 'Icon', label: 'My Icon Button' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: /my icon button/i })).toBeVisible()
  }
}

export const Active: Story = {
  args: { children: 'Active Icon', active: true, label: 'Active' }
}

export const Disabled: Story = {
  args: { children: 'Disabled Icon', disabled: true, label: 'Disabled' }
}
