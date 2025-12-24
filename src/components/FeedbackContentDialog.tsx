import { createSignal, createMemo, For, Show } from 'solid-js';
import { IconButton } from './buttons/IconButton';
import { Button } from './buttons/Button';
import { XIcon } from './icons';
import { transferChatHistoryToAutoFAQ } from '@/queries/sendMessageQuery';
import { MessageType } from './Bot';

type FeedbackContentDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (text: string, reason?: string) => void;
  reasons?: string[];
  errorMessage?: string;
  onErrorClear?: () => void;
  chatflowid?: string;
  chatId?: string;
  apiHost?: string;
  onRequest?: (request: RequestInit) => Promise<void>;
  onMessageAdd?: (message: MessageType) => void;
  userData?: {
    fio?: string;
    email?: string;
    user_name?: string;
    user_id?: string;
    shortname?: string;
    orn?: string;
    phone?: string;
  };
  isFullPage?: boolean;
  isOperatorConnected?: boolean; // Булевое значение, передается из родительского компонента
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
      if (props.errorMessage && props.onErrorClear) {
        props.onErrorClear();
      }
    }
  };

  const handleReasonChange = (reason: string) => {
    setSelectedReason(reason);
    if (props.errorMessage && props.onErrorClear) {
      props.onErrorClear();
    }
  };

  const countWords = (text: string): number => {
    return text
        .trim()
        .split(/\s+/)
        .filter((word) => word.length > 0).length;
  };

  const isSubmitDisabled = createMemo(() => {
    const reason = selectedReason();
    if (!reason) return true;
    // Если выбрано "Другое", комментарий обязателен
    if (reason === OTHER_REASON) {
      const trimmedValue = inputValue().trim();
      if (!trimmedValue) return true;
      const wordCount = countWords(trimmedValue);
      if (wordCount < 2) return true;
    }
    return false;
  });

  const showOperatorButton = createMemo(() => !!props.userData?.email);

  const submit = () => {
    if (!isSubmitDisabled()) {
      const reason = selectedReason();
      const comment = inputValue().trim();

      // Склеиваем причину и комментарий
      let finalText = reason;
      if (comment) {
        finalText = `${reason}: ${comment}`;
      }

      props.onSubmit(finalText, reason);
    }
  };

  const onClose = () => {
    setInputValue('');
    setSelectedReason('');
    props.onClose();
  };

  const handleTransferToOperator = async () => {
    if (!props.chatflowid || !props.chatId) {
      console.error('🔴 [FeedbackDialog] chatflowid или chatId не указаны');
      return;
    }

    try {
      // Формируем body для передачи оператору
      const reason = selectedReason();
      const comment = inputValue().trim();

      // Склеиваем причину и комментарий (reason всегда есть, т.к. кнопка активна только при выбранной причине)
      const userMessage = comment ? `${reason}: ${comment}` : reason;

      const requestBody = {
        chatId: props.chatId,
        userMessage,
        fio: props.userData?.fio || '',
        email: props.userData?.email || '',
        overrideConfig: {
          userData: {
            email: props.userData?.email || '',
            fio: props.userData?.fio || '',
            userId: props.userData?.user_id || '',
            shortname: props.userData?.shortname || '',
            orn: props.userData?.orn || '',
            phone: props.userData?.phone || '',
          },
        },
      };

      const result = await transferChatHistoryToAutoFAQ({
        chatflowid: props.chatflowid,
        apiHost: props.apiHost,
        body: requestBody,
        onRequest: props.onRequest,
      });

      if (result.data) {
        // Добавляем сообщение о передаче оператору
        if (props.onMessageAdd) {
          const transferMessage: MessageType = {
            message: 'Чат передан оператору. Ожидайте ответа...',
            type: 'apiMessage',
            dateTime: new Date().toISOString(),
            disableFeedback: true, // У этого сообщения не будет кнопок фидбэка
          };
          props.onMessageAdd(transferMessage);
        }

        props.onClose();
      } else if (result.error) {
        console.error('❌ [FeedbackDialog] Ошибка передачи истории:', result.error);
      }
    } catch (error) {
      console.error('❌ [FeedbackDialog] Ошибка при передаче истории в AutoFAQ:', error);
    }
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
              <div class={`relative flex-auto ${props.isFullPage === false ? 'p-5' : 'p-6'}`}>
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
                    rows={props.isFullPage === false ? 3 : 4}
                    class="block p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-gray-400 focus:border-gray-400 flex-1 w-full text-sm font-normal resize-none bg-blue-100 text-gray-800"
                    placeholder="Напишите свой комментарий"
                    value={inputValue()}
                />
                  <div class="absolute bottom-2 right-2 text-xs text-gray-400">
                    {inputValue().length}/{MAX_TEXT_LENGTH}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div class={`flex flex-col border-t border-solid border-gray-200 rounded-b-2xl space-y-3 ${props.isFullPage === false ? 'p-5' : 'p-6'}`}>
                <Show when={props.errorMessage}>
                  <p class="text-red-500 text-sm text-center">{props.errorMessage}</p>
                </Show>
                {/* Buttons */}
                <div class="flex flex-wrap items-center justify-end gap-3">
                  <Button text="Отмена" type="button" onClick={onClose} class={'flex-1 bg-white'} />
                  <Button
                      text="Отправить"
                      type="submit"
                      onClick={submit}
                      disabled={isSubmitDisabled()}
                      class={`flex-1 disabled:bg-gray-100 disabled:text-gray-400 bg-[var(--primary-color)]`}
                  />
                  {/* Contact operator button */}
                  <Show when={showOperatorButton()}>
                    <Button
                        text={props.isOperatorConnected ? 'Оператор уже вызван' : 'Связаться с оператором'}
                        type="button"
                        onClick={handleTransferToOperator}
                        disabled={props.isOperatorConnected || isSubmitDisabled()}
                        class={'min-w-full flex-1 bg-white'}
                    />
                  </Show>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="flex opacity-25 fixed inset-0 z-[1001] bg-black" />
      </>
  );
};

export default FeedbackContentDialog;
