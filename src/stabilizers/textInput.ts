export interface TextInputStabilizerConfig {
  /**
   * Disables React Native TextInput focusing APIs to avoid focus-driven caret
   * animation in screenshots.
   */
  disableFocus?: boolean;
  /**
   * Hides the caret and makes selection transparent to reduce visual noise.
   */
  hideCaret?: boolean;
}

type InternalTextInputStabilizerConfig = TextInputStabilizerConfig & {
  __unsafeModules?: {
    TextInput?: unknown;
    TextInputState?: unknown;
  };
};

let didApply = false;

export function applyTextInputStabilizer(
  config: TextInputStabilizerConfig = {},
): void {
  if (didApply) {
    return;
  }

  const { disableFocus = true, hideCaret = true } = config;

  const internal = config as InternalTextInputStabilizerConfig;

  try {
    const { TextInput, TextInputState } = internal.__unsafeModules
      ? {
          TextInput: internal.__unsafeModules.TextInput,
          TextInputState: internal.__unsafeModules.TextInputState,
        }
      : {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          TextInput: require('react-native').TextInput,
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          TextInputState: require('react-native/Libraries/Components/TextInput/TextInputState'),
        };

    didApply = true;

    const textInput = TextInput as
      | {
          defaultProps?: Record<string, unknown>;
          State?: {
            focusTextInput?: () => void;
          };
        }
      | undefined;

    const textInputState = TextInputState as
      | {
          focusTextInput?: () => void;
          focusInput?: () => void;
          blurTextInput?: () => void;
          blurInput?: () => void;
        }
      | undefined;

    if (hideCaret && textInput) {
      textInput.defaultProps = {
        ...(textInput.defaultProps || {}),
        caretHidden: true,
        selectionColor: 'transparent',
      };
    }

    if (disableFocus && textInput?.State?.focusTextInput) {
      textInput.State.focusTextInput = () => {};
    }

    if (disableFocus && textInputState?.focusTextInput) {
      textInputState.focusTextInput = () => {};
    }
    if (disableFocus && textInputState?.focusInput) {
      textInputState.focusInput = () => {};
    }
    if (disableFocus && textInputState?.blurTextInput) {
      textInputState.blurTextInput = () => {};
    }
    if (disableFocus && textInputState?.blurInput) {
      textInputState.blurInput = () => {};
    }
  } catch {
    // If react-native isn't available (e.g. running in Node), do nothing.
  }
}
