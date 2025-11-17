import { Show, createSignal, createEffect, onMount, Setter } from 'solid-js';
import { SendButton } from '@/components/buttons/SendButton';
import { FileEvent, UploadsConfig } from '@/components/Bot';
import { ImageUploadButton } from '@/components/buttons/ImageUploadButton';
import { AttachmentUploadButton } from '@/components/buttons/AttachmentUploadButton';
import { ChatInputHistory } from '@/utils/chatInputHistory';

type SendAreaProps = {
  placeholder?: string;
  inputValue: string;
  // Цвета настраиваются через Tailwind классы
  fontSize?: number;
  disabled?: boolean;
  onSubmit: (value: string) => void;
  onInputChange: (value: string) => void;
  uploadsConfig?: Partial<UploadsConfig>;
  isFullFileUpload?: boolean;
  setPreviews: Setter<unknown[]>;
  handleFileChange: (event: FileEvent<HTMLInputElement>) => void;
  maxChars?: number;
  maxCharsWarningMessage?: string;
  autoFocus?: boolean;
  fullFileUploadAllowedTypes?: string;
  enableInputHistory?: boolean;
  maxHistorySize?: number;
  isFullscreen?: boolean;
};

const defaultBackgroundColor = 'var(--chatbot-input-bg-color, #ffffff)';
const DEFAULT_HEIGHT = 56;

export const SendArea = (props: SendAreaProps) => {
  const [isSendButtonDisabled, setIsSendButtonDisabled] = createSignal(false);
  const [warningMessage, setWarningMessage] = createSignal('');
  const [inputHistory] = createSignal(new ChatInputHistory(() => props.maxHistorySize || 10));
  const [height, setHeight] = createSignal(DEFAULT_HEIGHT);
  let textareaRef: HTMLTextAreaElement | undefined;
  let fileUploadRef: HTMLInputElement | undefined;
  let imgUploadRef: HTMLInputElement | undefined;

  const handleInput = (e: Event) => {
    const target = e.currentTarget as HTMLTextAreaElement;
    const inputValue = target.value;

    // Автоматическое изменение высоты
    if (inputValue === '') {
      setHeight(DEFAULT_HEIGHT);
    } else {
      setHeight(target.scrollHeight);
    }
    target.scrollTo(0, target.scrollHeight);

    // Проверка лимита символов
    const wordCount = inputValue.length;
    if (props.maxChars && wordCount > props.maxChars) {
      setWarningMessage(props.maxCharsWarningMessage ?? `You exceeded the characters limit. Please input less than ${props.maxChars} characters.`);
      setIsSendButtonDisabled(true);
      return;
    }

    props.onInputChange(inputValue);
    setWarningMessage('');
    setIsSendButtonDisabled(false);
  };

  const checkIfInputIsValid = () => warningMessage() === '' && textareaRef?.reportValidity();

  const submit = () => {
    if (checkIfInputIsValid()) {
      if (props.enableInputHistory) {
        inputHistory().addToHistory(props.inputValue);
      }
      props.onSubmit(props.inputValue);
    }
  };

  const handleImageUploadClick = () => {
    if (imgUploadRef) imgUploadRef.click();
  };

  const handleFileUploadClick = () => {
    if (fileUploadRef) fileUploadRef.click();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    // Handle Shift + Enter new line
    if (e.keyCode === 13 && e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      const target = e.currentTarget as HTMLTextAreaElement;
      target.value += '\n';
      handleInput(e);
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      const isIMEComposition = e.isComposing || e.keyCode === 229;
      if (!isIMEComposition) {
        e.preventDefault();
        submit();
      }
    } else if (props.enableInputHistory) {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const previousInput = inputHistory().getPreviousInput(props.inputValue);
        props.onInputChange(previousInput);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextInput = inputHistory().getNextInput();
        props.onInputChange(nextInput);
      }
    }
  };

  createEffect(() => {
    const shouldAutoFocus = props.autoFocus !== undefined ? props.autoFocus : window.innerWidth >= 768;
    if (!props.disabled && shouldAutoFocus && textareaRef) textareaRef.focus();
  });

  onMount(() => {
    const shouldAutoFocus = props.autoFocus !== undefined ? props.autoFocus : window.innerWidth >= 768;
    if (!props.disabled && shouldAutoFocus && textareaRef) textareaRef.focus();
  });

  const handleFileChange = (event: FileEvent<HTMLInputElement>) => {
    props.handleFileChange(event);
    if (event.target) event.target.value = '';
  };

  const getFileType = () => {
    if (props.isFullFileUpload) return props.fullFileUploadAllowedTypes === '' ? '*' : props.fullFileUploadAllowedTypes;
    if (props.uploadsConfig?.fileUploadSizeAndTypes?.length) {
      const allowedFileTypes = props.uploadsConfig?.fileUploadSizeAndTypes.map((allowed) => allowed.fileTypes).join(',');
      if (allowedFileTypes.includes('*')) return '*';
      else return allowedFileTypes;
    }
    return '*';
  };

  return (
    <div
      class={`sticky bottom-0 w-full h-auto max-h-[192px] min-h-[72px] flex flex-col items-end justify-between chatbot-input border-t pb-4 z-10 text-gray-880 ${
        props.isFullscreen ? 'px-4 md:px-6 lg:px-8' : 'px-6'
      }`}
      data-testid="input"
      style={{
        'background-color': defaultBackgroundColor,
      }}
    >
      <Show when={warningMessage() !== ''}>
        <div class="w-full px-4 pt-4 pb-1 text-red-500 text-sm" data-testid="warning-message">
          {warningMessage()}
        </div>
      </Show>
      <div class="w-full flex items-center justify-between gap-4">
        {props.uploadsConfig?.isImageUploadAllowed ? (
          <>
            <ImageUploadButton
              type="button"
              class="m-0 h-14 flex items-center justify-center"
              isDisabled={props.disabled || isSendButtonDisabled()}
              on:click={handleImageUploadClick}
            >
              <span class="font-sans">Image Upload</span>
            </ImageUploadButton>
            <input
              style={{ display: 'none' }}
              multiple
              ref={imgUploadRef as HTMLInputElement}
              type="file"
              onChange={handleFileChange}
              accept={
                props.uploadsConfig?.imgUploadSizeAndTypes?.length
                  ? props.uploadsConfig?.imgUploadSizeAndTypes.map((allowed) => allowed.fileTypes).join(',')
                  : '*'
              }
            />
          </>
        ) : null}
        {props.uploadsConfig?.isRAGFileUploadAllowed || props.isFullFileUpload ? (
          <>
            <AttachmentUploadButton
              type="button"
              class="m-0 h-14 flex items-center justify-center"
              isDisabled={props.disabled || isSendButtonDisabled()}
              on:click={handleFileUploadClick}
            >
              <span class="font-sans">File Upload</span>
            </AttachmentUploadButton>
            <input
              style={{ display: 'none' }}
              multiple
              ref={fileUploadRef as HTMLInputElement}
              type="file"
              onChange={handleFileChange}
              accept={getFileType()}
            />
          </>
        ) : null}
        <textarea
          ref={textareaRef}
          value={props.inputValue}
          placeholder={props.placeholder ?? 'Введите свой вопрос'}
          disabled={props.disabled}
          class={`focus:outline-none bg-transparent px-0 pt-[25px] pb-0 flex-1 w-full h-full min-h-[56px] max-h-[128px] text-input placeholder:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:brightness-100 ${'caret-[var(--chatbot-input-caret-color)]'}`}
          style={{
            'font-size': props.fontSize ? `${props.fontSize}px` : '16px',
            resize: 'none',
            height: `${props.inputValue !== '' ? height() : DEFAULT_HEIGHT}px`,
          }}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
        />
        <SendButton
          type="button"
          isDisabled={props.disabled || isSendButtonDisabled() || !props.inputValue || props.inputValue.trim() === ''}
          class="m-0 mt-4 h-14 flex items-center justify-center"
          on:click={submit}
        />
      </div>
    </div>
  );
};
