import type { Meta, StoryObj } from '@storybook/react'
import { expect } from 'storybook/test'

import { AppBadge } from './AppBadge'

const meta = {
  component: AppBadge,
  tags: ['ai-generated', 'needs-work']
} satisfies Meta<typeof AppBadge>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { children: 'Badge' },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Badge')).toBeVisible()
  }
}
