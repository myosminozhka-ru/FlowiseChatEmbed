import { Show } from 'solid-js';
import { Button } from '../buttons/Button';
import { IconButton } from '../buttons/IconButton';
import { XIcon, CheckIcon } from '../icons';

type SuccessAlertProps = {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
};
export const SuccessAlert = (props: SuccessAlertProps) => {
  return (
    <Show when={props.isOpen}>
      <div class="fixed inset-0 z-[1002] flex items-center justify-center">
        <div class="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={props.onClose} />
        <div class="flex flex-col gap-4 relative bg-white rounded-2xl shadow-lg max-w-md w-full mx-4 p-6 text-center min-h-[308px]">
          <IconButton icon={<XIcon />} onClick={props.onClose} ariaLabel="Закрыть" class="absolute top-3 right-3" />
          <div class="flex flex-col gap-4 items-center pt-4 pb-6 mt-auto">
            <CheckIcon color="var(--primary-color)" width="48" height="35" />
            <p class="text-gray-800 text-base mb-6">{props.message || 'Ваше сообщение отправлено.'}</p>
            <Button text="Закрыть" onClick={props.onClose} class="w-full mt-auto" />
          </div>
        </div>
      </div>
    </Show>
  );
};
