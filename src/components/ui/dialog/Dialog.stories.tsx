import * as Dialog from '@radix-ui/react-dialog'
import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { expect, userEvent, within } from 'storybook/test'

import { AppDialogBody } from './AppDialogBody'
import { AppDialogFooter } from './AppDialogFooter'
import { AppDialogHeader } from './AppDialogHeader'
import { AppDialogRoot } from './AppDialogRoot'

const meta = {
  title: 'Design System/Dialog',
  component: AppDialogRoot,
  tags: ['autodocs']
} satisfies Meta<typeof AppDialogRoot>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {
  render: () => {
    const [open, setOpen] = useState(false)
    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>
          Open dialog
        </button>
        <AppDialogRoot open={open} onOpenChange={setOpen} size="sm">
          <AppDialogHeader
            heading="Integration settings"
            description="Configure a reusable provider."
            closeLabel="Close"
          />
          <AppDialogBody>
            <p className="text-xs text-surface">
              Dialog bodies scroll independently of their header and footer.
            </p>
          </AppDialogBody>
          <AppDialogFooter>
            <Dialog.Close asChild>
              <button type="button" className="rounded bg-accent px-3 py-1.5 text-xs text-white">
                Done
              </button>
            </Dialog.Close>
          </AppDialogFooter>
        </AppDialogRoot>
      </>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Open dialog' }))
    const body = within(document.body)
    await expect(body.getByRole('dialog')).toBeVisible()
    await userEvent.click(body.getByRole('button', { name: 'Done' }))
    await expect(body.queryByRole('dialog')).not.toBeInTheDocument()
  }
}

export const CssCheck: Story = {
  render: () => (
    <button type="button" className="bg-accent">
      Test
    </button>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const button = canvas.getByRole('button', { name: 'Test' })
    // Verify that the Tailwind class 'bg-accent' actually applied a color (which proves global CSS loaded).
    // Note: getComputedStyle returns the color resolved. We just check it's not transparent/default if CSS failed.
    const color = getComputedStyle(button).backgroundColor
    expect(color).not.toBe('rgba(0, 0, 0, 0)')
    expect(color).not.toBe('transparent')
  }
}
