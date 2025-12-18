import { describe, expect, test } from 'bun:test';
import type { TextInputStabilizerConfig } from '../src/stabilizers/textInput';

const originalFocusTextInput = () => 'focusTextInput';
const originalFocusInput = () => 'focusInput';
const originalBlurTextInput = () => 'blurTextInput';
const originalBlurInput = () => 'blurInput';

type MockTextInput = {
  defaultProps?: Record<string, unknown>;
  State?: {
    focusTextInput?: () => unknown;
  };
};

type MockTextInputState = {
  focusTextInput?: () => unknown;
  focusInput?: () => unknown;
  blurTextInput?: () => unknown;
  blurInput?: () => unknown;
};

const rnTextInput: MockTextInput = {
  defaultProps: { testExisting: true },
  State: {
    focusTextInput: originalFocusTextInput,
  },
};

const rnTextInputState: MockTextInputState = {
  focusTextInput: originalFocusTextInput,
  focusInput: originalFocusInput,
  blurTextInput: originalBlurTextInput,
  blurInput: originalBlurInput,
};

describe('applyTextInputStabilizer', () => {
  test('hides caret and disables focus APIs', async () => {
    const { applyTextInputStabilizer } = await import(
      '../src/stabilizers/textInput'
    );

    applyTextInputStabilizer({
      __unsafeModules: {
        TextInput: rnTextInput,
        TextInputState: rnTextInputState,
      },
    } as unknown as TextInputStabilizerConfig);

    expect(rnTextInput.defaultProps).toMatchObject({
      testExisting: true,
      caretHidden: true,
      selectionColor: 'transparent',
    });

    expect(rnTextInput.State.focusTextInput).not.toBe(originalFocusTextInput);
    expect(rnTextInputState.focusTextInput).not.toBe(originalFocusTextInput);
    expect(rnTextInputState.focusInput).not.toBe(originalFocusInput);
    expect(rnTextInputState.blurTextInput).not.toBe(originalBlurTextInput);
    expect(rnTextInputState.blurInput).not.toBe(originalBlurInput);
  });

  test('is idempotent', async () => {
    const { applyTextInputStabilizer } = await import(
      '../src/stabilizers/textInput'
    );

    const currentDefaultProps = rnTextInput.defaultProps;
    const currentFocusInput = rnTextInputState.focusInput;

    applyTextInputStabilizer({
      __unsafeModules: {
        TextInput: rnTextInput,
        TextInputState: rnTextInputState,
      },
    } as unknown as TextInputStabilizerConfig);

    expect(rnTextInput.defaultProps).toBe(currentDefaultProps);
    expect(rnTextInputState.focusInput).toBe(currentFocusInput);
  });
});
