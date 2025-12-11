import { JSX } from 'solid-js/jsx-runtime';

type ButtonProps = {
  text: string;
  class?: string;
  ariaLabel?: string;
} & JSX.ButtonHTMLAttributes<HTMLButtonElement>;

export const Button = (props: ButtonProps) => {
  const { text, class: className, ariaLabel, style, type, onClick, ...restProps } = props;
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
        focus:outline-none
        shadow-xs 
        disabled:cursor-not-allowed hover:shadow-none ` + (className || '')
      }
      style={style && typeof style === 'object' ? style : {}}
    >
      {text}
    </button>
  );
};
