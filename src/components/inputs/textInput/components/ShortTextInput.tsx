import { createSignal, splitProps } from 'solid-js';
import { JSX } from 'solid-js/jsx-runtime';

type ShortTextInputProps = {
  ref: HTMLInputElement | HTMLTextAreaElement | undefined;
  onInput: (value: string) => void;
  fontSize?: number;
  disabled?: boolean;
  paddingX?: string;
  paddingY?: string;
} & Omit<JSX.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onInput'>;

const DEFAULT_HEIGHT = 56;

export const ShortTextInput = (props: ShortTextInputProps) => {
  const [local, others] = splitProps(props, ['ref', 'onInput']);
  const [height, setHeight] = createSignal(56);

  // @ts-expect-error: unknown type
  const handleInput = (e) => {
    if (props.ref) {
      if (e.currentTarget.value === '') {
        // reset height when value is empty
        setHeight(DEFAULT_HEIGHT);
      } else {
        setHeight(e.currentTarget.scrollHeight - 24);
      }
      e.currentTarget.scrollTo(0, e.currentTarget.scrollHeight);
      local.onInput(e.currentTarget.value);
    }
  };

  // @ts-expect-error: unknown type
  const handleKeyDown = (e) => {
    // Handle Shift + Enter new line
    if (e.keyCode == 13 && e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.value += '\n';
      handleInput(e);
    }
  };

  const paddingX = props.paddingX ?? 'px-4';
  const paddingY = props.paddingY ?? 'py-4';
  const isEmpty = !props.value || props.value === '';
  // Для центрирования placeholder: если поле пустое и paddingY = py-0, добавляем padding-top
  const shouldCenterPlaceholder = isEmpty && paddingY === 'py-0';
  const fontSize = props.fontSize ?? 16;
  // Вычисляем padding-top для центрирования: (min-height - font-size) / 2
  const centerPaddingTop = shouldCenterPlaceholder ? `${(56 - fontSize) / 2}px` : undefined;

  return (
    <textarea
      ref={props.ref}
      class={`focus:outline-none bg-transparent ${paddingX} ${paddingY} flex-1 w-full h-full min-h-[56px] max-h-[128px] text-input placeholder:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:brightness-100 ${'caret-[var(--chatbot-input-caret-color)]'}`}
      disabled={props.disabled}
      style={{
        'font-size': `${fontSize}px`,
        resize: 'none',
        'padding-top': centerPaddingTop,
      }}
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      {...others}
    />
  );
};
