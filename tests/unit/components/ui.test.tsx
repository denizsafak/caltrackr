import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '@/components/ui';

jest.mock('expo-router', () => ({
  Link: jest.fn(({ children }) => children),
}));

// Mock Lucide icons
jest.mock('lucide-react-native', () => ({
  ArrowRight: () => 'ArrowRightIcon',
}));

describe('Button Component', () => {
  it('renders children text correctly', () => {
    const { getByText } = render(<Button>Click Me</Button>);
    expect(getByText('Click Me')).toBeTruthy();
  });

  it('calls onPress when clicked', () => {
    const onPressMock = jest.fn();
    const { getByText } = render(
      <Button onPress={onPressMock}>Submit</Button>
    );

    fireEvent.press(getByText('Submit'));
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPressMock = jest.fn();
    const { getByText } = render(
      <Button onPress={onPressMock} disabled={true}>
        Submit
      </Button>
    );

    fireEvent.press(getByText('Submit'));
    expect(onPressMock).not.toHaveBeenCalled();
  });
});
