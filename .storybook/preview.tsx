import type { Preview } from '@storybook/nextjs-vite'
import React from 'react'
import '../src/app.css'
import { mswLoader } from 'msw-storybook-addon/csf3'
import { mswHandlers } from './msw-handlers'

const preview: Preview = {
  decorators: [
    (Story) => (
      <div className="dark font-sans antialiased bg-background text-foreground min-h-screen">
        <Story />
      </div>
    )
  ],
  loaders: [mswLoader()],
  parameters: {
    msw: { handlers: mswHandlers },
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo'
    }
  },
};

export default preview;