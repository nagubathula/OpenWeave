import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from 'storybook/test';
import { AppComboboxInput } from './AppComboboxInput';
import { useState } from 'react';

const meta = {
  component: AppComboboxInput,
  tags: ['ai-generated', 'needs-work'],
} satisfies Meta<typeof AppComboboxInput>;

export default meta;
type Story = StoryObj<typeof meta>;

const StatefulWrapper = (args: any) => {
  const [val, setVal] = useState('');
  return <AppComboboxInput {...args} value={val} onValueChange={setVal} />;
};

export const Default: Story = {
  render: (args) => <StatefulWrapper {...args} />,
  args: {
    placeholder: 'Search fruit...',
    options: [
      { value: 'apple', label: 'Apple' },
      { value: 'banana', label: 'Banana' },
      { value: 'cherry', label: 'Cherry' },
    ],
    value: '',
    onValueChange: () => {},
  },
  play: async ({ canvas, canvasElement, userEvent }) => {
    const input = canvas.getByPlaceholderText(/search fruit/i);
    await expect(input).toBeVisible();
    await userEvent.click(input);
    
    // Radix Popover renders outside canvasElement
    const body = canvasElement.ownerDocument.body;
    // The options open on ArrowDown
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('a');
    
    const option = await within(body).findByText('Apple');
    await expect(option).toBeVisible();
    await userEvent.click(option);
  },
};
