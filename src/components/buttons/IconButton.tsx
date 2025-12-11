import { JSX } from 'solid-js/jsx-runtime';

type IconButtonProps = {
  icon: JSX.Element;
  disabled?: boolean;
  class?: string;
  ariaLabel?: string;
} & JSX.ButtonHTMLAttributes<HTMLButtonElement>;

export const IconButton = (props: IconButtonProps) => {
  return (
    <button
      type={props.type || 'button'}
      disabled={props.disabled}
      aria-label={props.ariaLabel}
      {...props}
      class={
        `flex items-center justify-center w-[40px] h-[40px] rounded-xl
        bg-white text-gray-880
        transition-all duration-150 
        active:scale-95 active:bg-gray-200 
        focus:outline-none 
        shadow-xs 
        disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
        hover:text-[var(--chatbot-button-bg-color)] hover:scale-105 ` + props.class
      }
    >
      {props.icon}
    </button>
  );
};
