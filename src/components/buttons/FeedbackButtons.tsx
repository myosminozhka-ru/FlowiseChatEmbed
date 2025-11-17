import { JSX } from 'solid-js/jsx-runtime';
import { ClipboardIcon, ThumbsDownIcon, ThumbsUpIcon } from '../icons';

type RatingButtonProps = {
  feedbackColor?: string;
  isDisabled?: boolean;
  isLoading?: boolean;
  disableIcon?: boolean;
  rating?: string;
} & JSX.ButtonHTMLAttributes<HTMLButtonElement>;

const defaultFeedbackColor = 'rgba(11, 17, 19, 0.5)'; // gray-500

export const CopyToClipboardButton = (props: RatingButtonProps) => {
  return (
    <button
      disabled={props.isDisabled || props.isLoading}
      {...props}
      class={
        'p-2 justify-center font-semibold text-white focus:outline-none flex items-center disabled:opacity-50 disabled:cursor-not-allowed disabled:brightness-100 transition-all filter hover:brightness-90 active:brightness-75 chatbot-button ' +
        props.class
      }
      style={{ background: 'transparent', border: 'none' }}
      title="Copy to clipboard"
    >
      <ClipboardIcon color={props.feedbackColor ?? defaultFeedbackColor} class={'send-icon flex ' + (props.disableIcon ? 'hidden' : '')} />
    </button>
  );
};

export const ThumbsUpButton = (props: RatingButtonProps) => {
  return (
    <button
      type="submit"
      disabled={props.isDisabled || props.isLoading}
      {...props}
      class={'' + props.class}
      style={{ background: 'transparent', border: 'none' }}
      title="Понравилось"
    >
      <ThumbsUpIcon color={props.feedbackColor ?? defaultFeedbackColor} class={'send-icon flex ' + (props.disableIcon ? 'hidden' : '')} />
    </button>
  );
};

export const ThumbsDownButton = (props: RatingButtonProps) => {
  return (
    <button
      type="submit"
      disabled={props.isDisabled || props.isLoading}
      {...props}
      class={'' + props.class}
      style={{ background: 'transparent', border: 'none' }}
      title="Не понравилось"
    >
      <ThumbsDownIcon color={props.feedbackColor ?? defaultFeedbackColor} class={'send-icon flex ' + (props.disableIcon ? 'hidden' : '')} />
    </button>
  );
};
