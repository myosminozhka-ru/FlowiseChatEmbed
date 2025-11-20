import { JSX } from 'solid-js/jsx-runtime';
import { DeleteIcon } from '../icons';

type DeleteButtonProps = {
  isDisabled?: boolean;
  isLoading?: boolean;
  disableIcon?: boolean;
  text?: string;
} & JSX.ButtonHTMLAttributes<HTMLButtonElement>;

export const DeleteButton = (props: DeleteButtonProps) => {
  return (
    <button
      type="submit"
      {...props}
      disabled={props.isDisabled || props.isLoading || props.disabled}
      class={
        `flex justify-center items-center min-h-8 py-1 text-gray-880 disabled:text-gray-100 disabled:opacity-60 hover:text-[var(--chatbot-button-bg-color)] transition-colors ` +
        props.class
      }
      title="Reset Chat"
    >
      <DeleteIcon class={props.disableIcon ? 'hidden' : ''} />
      {props.text && <span class="ml-2">{props.text}</span>}
    </button>
  );
};
