import { createSignal, createMemo, For, Show } from 'solid-js';
import { IconButton } from './buttons/IconButton';
import { Button } from './buttons/Button';
import { XIcon } from './icons';

type FeedbackContentDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (text: string, reason?: string) => void;
  reasons?: string[];
  // Цвета настраиваются через Tailwind классы
  // Добавьте новые props для AutoFAQ интеграции:
  onTransferToOperator?: () => void;
  showTransferButton?: boolean; // Показывать ли кнопку переключения
};

const defaultBackgroundColor = 'var(--chatbot-input-bg-color, #ffffff)';

const OTHER_REASON = 'Другое';

const DEFAULT_REASONS: string[] = [
  'Ответа на мой вопрос нет',
  'Ответ неполный',
  'Текст ответа непонятен',
  'Не согласен с ответом',
  'Ссылки не работают',
];

const MAX_TEXT_LENGTH = 500;

const FeedbackContentDialog = (props: FeedbackContentDialogProps) => {
  const [inputValue, setInputValue] = createSignal('');
  const [selectedReason, setSelectedReason] = createSignal<string>('');
  let inputRef: HTMLTextAreaElement | undefined;

  // Объединяем переданные причины с "Другое" (которое всегда в конце)
  const reasons = () => {
    const customReasons = props.reasons || DEFAULT_REASONS;
    return [...customReasons, OTHER_REASON];
  };

  const handleInput = (value: string) => {
    if (value.length <= MAX_TEXT_LENGTH) {
      setInputValue(value);
    }
  };

  const handleReasonChange = (reason: string) => {
    setSelectedReason(reason);
  };

  // Используем createMemo для реактивности
  const isSubmitDisabled = createMemo(() => {
    const reason = selectedReason();
    // Если нет выбранной причины - disabled
    if (!reason) return true;
    // Если выбрана "Другое" и поле пустое - disabled
    if (reason === OTHER_REASON && !inputValue().trim()) return true;
    // Во всех остальных случаях - активна
    return false;
  });

  const submit = () => {
    if (!isSubmitDisabled()) {
      const reason = selectedReason();
      const text = reason === OTHER_REASON ? inputValue() : '';
      props.onSubmit(text, reason);
      setInputValue('');
      setSelectedReason('');
    }
  };

  const onClose = () => {
    setInputValue('');
    setSelectedReason('');
    props.onClose();
  };

  return (
    <>
      <div class="flex overflow-x-hidden overflow-y-auto fixed inset-0 z-[1002] outline-none focus:outline-none justify-center items-center">
        <div class="relative my-6 w-[380px] mx-4">
          <div
            class="border-0 rounded-2xl shadow-lg relative flex flex-col w-full bg-white outline-none focus:outline-none text-gray-880"
            style={{
              'background-color': defaultBackgroundColor,
            }}
          >
            {/* Header */}
            <div class="flex items-center justify-between py-3 pl-5 pr-3 border-b border-solid border-gray-200 rounded-t-2xl">
              <span class="whitespace-pre-wrap font-semibold text-base text-gray-800">Что именно не понравилось?</span>
              <IconButton icon={<XIcon />} onClick={onClose} ariaLabel="Закрыть" class="ml-auto" />
            </div>

            {/* Content */}
            <div class="relative p-6 flex-auto">
              {/* Radio buttons */}
              <div class="space-y-3 mb-6">
                <For each={reasons()}>
                  {(reason) => (
                    <label class="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="feedback-reason"
                        value={reason}
                        checked={selectedReason() === reason}
                        onChange={(e) => handleReasonChange(e.currentTarget.value)}
                      />
                      <span class="ml-3 text-sm text-gray-700">{reason}</span>
                    </label>
                  )}
                </For>
              </div>

              {/* Text input */}
              <div class="relative">
                <textarea
                  onInput={(e) => handleInput(e.currentTarget.value)}
                  ref={inputRef}
                  rows="4"
                  disabled={selectedReason() !== OTHER_REASON}
                  class={`block p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-gray-400 focus:border-gray-400 flex-1 w-full text-sm font-normal resize-none ${
                    selectedReason() !== OTHER_REASON ? 'bg-blue-50 opacity-50 cursor-not-allowed' : 'bg-blue-100'
                  } text-gray-800`}
                  placeholder="Напишите свой вариант"
                  value={inputValue()}
                />
                <div class="absolute bottom-2 right-2 text-xs text-gray-400">
                  {inputValue().length}/{MAX_TEXT_LENGTH}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div class="flex flex-col p-6 border-t border-solid border-gray-200 rounded-b-2xl space-y-3">
              {/* Buttons */}
              <div class="flex items-center justify-end space-x-3">
                <Button text="Отмена" type="button" onClick={onClose} class={'flex-1 bg-white'} />
                <Button
                  text="Отправить"
                  type="submit"
                  onClick={submit}
                  disabled={isSubmitDisabled()}
                  class={`flex-1 disabled:bg-gray-100 disabled:text-gray-400 bg-[var(--primary-color)]`}
                />
              </div>

              {/* Contact operator button */}
              <Show when={props.showTransferButton !== false}>
                <div class="flex justify-center">
                  <Button
                    text="Связаться с оператором2"
                    type="button"
                    onClick={() => {
                      console.log('🔵 [FeedbackDialog] Кнопка "Связаться с оператором" нажата');
                      console.log('🔵 [FeedbackDialog] onTransferToOperator:', typeof props.onTransferToOperator);
                      if (props.onTransferToOperator) {
                        console.log('🔵 [FeedbackDialog] Вызываем onTransferToOperator');
                        props.onTransferToOperator();
                      } else {
                        console.warn('⚠️ [FeedbackDialog] onTransferToOperator не передан');
                      }
                    }}
                    class={'flex-1 bg-white'}
                  />
                </div>
              </Show>
            </div>
          </div>
        </div>
      </div>
      <div class="flex opacity-25 fixed inset-0 z-[1001] bg-black" />
    </>
  );
};

export default FeedbackContentDialog;
