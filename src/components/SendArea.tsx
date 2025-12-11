import { Show, createSignal, createEffect, onMount, Setter } from 'solid-js';
import { SendButton } from '@/components/buttons/SendButton';
import { FileEvent, UploadsConfig } from '@/components/Bot';
import { ImageUploadButton } from '@/components/buttons/ImageUploadButton';
import { AttachmentUploadButton } from '@/components/buttons/AttachmentUploadButton';
import { ChatInputHistory } from '@/utils/chatInputHistory';

type SendAreaProps = {
  placeholder?: string;
  inputValue: string;
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
const DEFAULT_MAX_CHARS = 200;

export const SendArea = (props: SendAreaProps) => {
  const [isSendButtonDisabled, setIsSendButtonDisabled] = createSignal(false);
  const [warningMessage, setWarningMessage] = createSignal('');
  const [inputHistory] = createSignal(new ChatInputHistory(() => props.maxHistorySize || 10));
  let textareaRef: HTMLTextAreaElement | undefined;
  let fileUploadRef: HTMLInputElement | undefined;
  let imgUploadRef: HTMLInputElement | undefined;

  const adjustTextarea = (target: HTMLTextAreaElement) => {
    // Используем только props.inputValue, так как это контролируемое значение
    // target.value может быть устаревшим при очистке поля
    const value = props.inputValue;
    
    // Если поле пустое - одна строка
    if (!value || value.trim() === '') {
      target.style.whiteSpace = 'nowrap';
      target.style.height = '24px';
      return;
    }

    // Временно устанавливаем nowrap для проверки, помещается ли текст в одну строку
    target.style.whiteSpace = 'nowrap';
    target.style.height = 'auto';
    
    // Используем setTimeout для корректного расчета scrollWidth после изменения стилей
    setTimeout(() => {
      if (!target || target !== textareaRef) return;
      
      if (target.scrollWidth > target.clientWidth) {
        // Если не помещается - разрешаем перенос
        target.style.whiteSpace = 'normal';
        target.style.height = 'auto';
        // Максимальная высота = 100% от родителя
        const maxHeight = target.parentElement?.clientHeight || 100;
        const newHeight = Math.min(target.scrollHeight, maxHeight);
        target.style.height = `${newHeight}px`;
      } else {
        // Если помещается - оставляем одну строку
        target.style.whiteSpace = 'nowrap';
        target.style.height = '24px'; // Высота одной строки
      }
    }, 0);
  };

  const handleInput = (e: Event) => {
    const target = e.currentTarget as HTMLTextAreaElement;
    const inputValue = target.value;

    // Адаптивное изменение высоты (как на скриншоте)
    adjustTextarea(target);

    // Проверка лимита символов
    const wordCount = inputValue.length;
    const maxChars = props.maxChars ?? DEFAULT_MAX_CHARS;
    if (wordCount > maxChars) {
      setWarningMessage(props.maxCharsWarningMessage ?? `Превышен лимит символов. Пожалуйста, введите менее ${maxChars} символов.`);
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

  // Обновляем высоту при изменении inputValue извне
  createEffect(() => {
    // Явно отслеживаем props.inputValue для реактивности
    const currentValue = props.inputValue;
    if (textareaRef && currentValue !== undefined) {
      // Используем setTimeout для корректного расчета после очистки
      setTimeout(() => {
        if (textareaRef) {
          adjustTextarea(textareaRef);
        }
      }, 10);
    }
  });

  onMount(() => {
    const shouldAutoFocus = props.autoFocus !== undefined ? props.autoFocus : window.innerWidth >= 768;
    if (!props.disabled && shouldAutoFocus && textareaRef) textareaRef.focus();

    // Устанавливаем начальную высоту
    if (textareaRef) {
      adjustTextarea(textareaRef);
    }

    // Также вызываем при ресайзе окна
    const handleResize = () => {
      if (textareaRef) {
        adjustTextarea(textareaRef);
      }
    };
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
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
      class={`sticky bottom-0 w-full min-h-[72px] flex flex-col chatbot-input border-t py-3 pr-[66px] z-10 text-gray-880 ${
        props.isFullscreen ? 'px-4 md:px-6 lg:px-8' : 'px-6'
      }`}
      data-testid="input"
      style={{
        'background-color': defaultBackgroundColor,
      }}
    >
      <Show when={warningMessage() !== ''}>
        <div class="absolute bottom-full left-0 right-0 bg-white/30 w-full p-4 text-red-500 text-sm" data-testid="warning-message">
          {warningMessage()}
        </div>
      </Show>
      <div class="w-full h-full flex items-center gap-4">
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
          placeholder={props.placeholder ?? 'Напишите свой вопрос...'}
          disabled={props.disabled}
          class={`focus:outline-none bg-transparent flex-1 !p-0 w-full text-input placeholder:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:brightness-100 ${'caret-[var(--chatbot-input-caret-color)]'}`}
          style={{
            'font-size': props.fontSize ? `${props.fontSize}px` : '16px',
            'line-height': '1.5',
            resize: 'none',
            height: '24px', // Изначально одна строка = 24px
            'max-height': '100%', // Максимальная высота = 100%
            'overflow-y': 'auto',
            transition: 'height 0.3s ease',
            'padding-top': props.inputValue === '' ? 'calc((24px - 1.5em) / 2)' : '0',
          }}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
        />
      </div>
      <SendButton
        type="button"
        isDisabled={props.disabled || isSendButtonDisabled() || !props.inputValue || props.inputValue.trim() === ''}
        class={`absolute top-1/2 -translate-y-1/2 h-14 flex items-center justify-center ${
          props.isFullscreen ? 'right-4 md:right-6 lg:right-8' : 'right-6'
        }`}
        on:click={submit}
      />
    </div>
  );
};
