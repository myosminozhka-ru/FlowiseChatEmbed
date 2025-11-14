import { JSX } from 'solid-js/jsx-runtime';

type ButtonProps = {
  text: string;
  backgroundColor?: string;
  class?: string;
  ariaLabel?: string;
} & JSX.ButtonHTMLAttributes<HTMLButtonElement>;

export const Button = (props: ButtonProps) => {
  const { text, backgroundColor, class: className, ariaLabel, style, type, onClick, ...restProps } = props;
  return (
    <button
      type={type || 'button'}
      aria-label={ariaLabel}
      onClick={onClick}
      {...restProps}
      disabled={props.disabled}
      class={
        `flex items-center justify-center min-h-[42px] px-3 rounded-xl
        text-gray-880
        transition-all duration-150 
        active:scale-95 active:bg-gray-200 
        focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1
        shadow-xs 
        disabled:cursor-not-allowed hover:shadow-none ` +
        (className || '')
      }
      style={{
        ...(backgroundColor && !className?.includes('bg-') ? { 'background-color': backgroundColor } : {}),
        ...(style && typeof style === 'object' ? style : {}),
      }}
    >
      {text}
    </button>

  );
};

