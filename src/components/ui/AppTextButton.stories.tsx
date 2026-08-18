import type { Meta, StoryObj } from '@storybook/react'
import { expect } from 'storybook/test'

import { AppTextButton } from './AppTextButton'

const meta = {
  component: AppTextButton,
  tags: ['ai-generated', 'needs-work']
} satisfies Meta<typeof AppTextButton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { children: 'Click me' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: /click me/i })).toBeVisible()
  }
}

export const ExtraSmall: Story = {
  args: { children: 'Extra small', size: 'xs' }
}

export const Underlined: Story = {
  args: { children: 'Underlined', underline: true }
}

export const CssCheck: Story = {
  args: { children: 'Check CSS' },
  play: async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: /check css/i })
    // Should have text-muted color (var(--muted) typically maps to a specific hex/rgb, but we can check if it's not the default black)
    // Actually, tailwind cursor-pointer sets cursor to pointer.
    await expect(getComputedStyle(button).cursor).toBe('pointer')
  }
}
