import type { Meta, StoryObj } from '@storybook/react'
import { Files } from 'lucide-react'

import { AppPlaceholder } from './AppPlaceholder'

const meta = {
  title: 'Design System/Placeholder',
  component: AppPlaceholder,
  args: {
    label: 'No documents yet',
    description: 'Create a document to start working in this space.',
    size: 'panel'
  },
  render: (args) => (
    <div className="flex h-72 w-full bg-app text-surface">
      <AppPlaceholder
        {...args}
        icon={<Files className="size-5" />}
        action={
          <button type="button" className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-white">
            Create document
          </button>
        }
      />
    </div>
  )
} satisfies Meta<typeof AppPlaceholder>

export default meta
type Story = StoryObj<typeof meta>

export const Panel: Story = {}

export const Compact: Story = {
  args: {
    label: 'No results',
    description: undefined,
    size: 'compact'
  }
}

