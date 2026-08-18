import type { Meta, StoryObj } from '@storybook/react'
import { expect, userEvent } from 'storybook/test'

import { AppSwitch } from './AppSwitch'

const meta = {
  component: AppSwitch,
  tags: ['ai-generated', 'needs-work']
} satisfies Meta<typeof AppSwitch>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { label: 'Toggle Feature', value: false },
  play: async ({ canvas, userEvent }) => {
    const switchEl = canvas.getByRole('switch', { name: /toggle feature/i })
    await expect(switchEl).toBeVisible()
    await userEvent.click(switchEl)
    // Since it's a controlled component, clicking doesn't change `checked` without state management in the story,
    // but the interaction proves it handles clicks without throwing.
  }
}

export const Checked: Story = {
  args: { label: 'Checked', value: true }
}

export const Disabled: Story = {
  args: { label: 'Disabled', disabled: true }
}
