import { JSX } from 'solid-js/jsx-runtime';
import { SendIcon } from '../icons';
import { IconButton } from './IconButton';

type SendButtonProps = {
  isDisabled?: boolean;
  isLoading?: boolean;
  disableIcon?: boolean;
} & JSX.ButtonHTMLAttributes<HTMLButtonElement>;

export const SendButton = (props: SendButtonProps) => {
  return (
    <IconButton
      type="submit"
      disabled={props.isDisabled || props.isLoading}
      ariaLabel="Отправить сообщение"
      {...props}
      class={props.class}
      icon={<SendIcon class={props.disableIcon ? 'hidden' : ''} />}
    />
  );
};
