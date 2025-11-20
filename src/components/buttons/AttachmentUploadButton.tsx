import { JSX } from 'solid-js/jsx-runtime';
import { AttachmentIcon } from '../icons';

type FileUploadButtonProps = {
  isDisabled?: boolean;
  isLoading?: boolean;
  disableIcon?: boolean;
} & JSX.ButtonHTMLAttributes<HTMLButtonElement>;

export const AttachmentUploadButton = (props: FileUploadButtonProps) => {
  return (
    <button
      type="submit"
      disabled={props.isDisabled || props.isLoading}
      {...props}
      class={
        'group py-2 pl-4 pr-0 justify-center font-semibold focus:outline-none flex items-center shadow-sm disabled:shadow-none disabled:opacity-50 disabled:cursor-not-allowed disabled:brightness-100 transition-all filter active:brightness-75 chatbot-button ' +
        props.class
      }
      style={{ background: 'transparent', border: 'none' }}
    >
      <AttachmentIcon class="transition-colors group-hover:stroke-[var(--chatbot-button-bg-color)]" />
    </button>
  );
};
