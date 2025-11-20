import { Show, splitProps } from 'solid-js';

export type DisclaimerPopupProps = {
  isOpen?: boolean;
  isFullPage?: boolean; // New prop to indicate full-page mode
  onAccept?: () => void;
  onDeny?: () => void;
  title?: string;
  message?: string;
  buttonText?: string;
  denyButtonText?: string;
};

export const DisclaimerPopup = (props: DisclaimerPopupProps) => {
  const [popupProps] = splitProps(props, [
    'onAccept',
    'onDeny',
    'isOpen',
    'isFullPage', // New prop
    'title',
    'message',
    'buttonText',
    'denyButtonText',
  ]);

  const handleAccept = () => {
    popupProps.onAccept?.();
  };

  const handleDeny = () => {
    popupProps.onDeny?.();
  };

  return (
    <Show when={popupProps.isOpen}>
      <div class="fixed inset-0 rounded-lg flex items-center justify-center backdrop-blur-sm z-50 bg-black/40">
        <div class="p-10 rounded-lg shadow-lg max-w-md w-full text-center mx-4 font-sans bg-white text-black">
          <h2 class="text-2xl font-semibold mb-4 flex justify-center items-center">{popupProps.title ?? 'Отказ от ответственности'}</h2>

          <p
            class="text-gray-700 text-base mb-6"
            innerHTML={popupProps.message ?? 'Используя этот чат-бот, вы соглашаетесь с условиями использования.'}
          />

          <div class="flex justify-center space-x-4">
            <button
              class="font-bold py-2 px-6 rounded focus:outline-none focus:shadow-outline bg-blue-500 text-white hover:bg-blue-600"
              onClick={handleAccept}
            >
              {popupProps.buttonText ?? 'Начать общение'}
            </button>

            {/* Only show the Cancel button if not in full-page mode */}
            <Show when={!popupProps.isFullPage}>
              <button
                class="font-bold py-2 px-6 rounded focus:outline-none focus:shadow-outline bg-red-500 text-white hover:bg-red-600"
                onClick={handleDeny}
              >
                {popupProps.denyButtonText ?? 'Отмена'}
              </button>
            </Show>
          </div>
        </div>
      </div>
    </Show>
  );
};
