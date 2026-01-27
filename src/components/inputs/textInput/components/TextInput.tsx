import { ShortTextInput } from './ShortTextInput';
import { isMobile } from '@/utils/isMobileSignal';
import { Show, createSignal, createEffect, onMount, Setter } from 'solid-js';
import { SendButton } from '@/components/buttons/SendButton';
import { FileEvent, UploadsConfig } from '@/components/Bot';
import { ImageUploadButton } from '@/components/buttons/ImageUploadButton';
import { RecordAudioButton } from '@/components/buttons/RecordAudioButton';
import { AttachmentUploadButton } from '@/components/buttons/AttachmentUploadButton';
import { ChatInputHistory } from '@/utils/chatInputHistory';

type TextInputProps = {
  placeholder?: string;
  backgroundColor?: string;
  textColor?: string;
  sendButtonColor?: string;
  inputValue: string;
  fontSize?: number;
  disabled?: boolean;
  onSubmit: (value: string) => void;
  onInputChange: (value: string) => void;
  uploadsConfig?: Partial<UploadsConfig>;
  isFullFileUpload?: boolean;
  setPreviews: Setter<unknown[]>;
  onMicrophoneClicked: () => void;
  handleFileChange: (event: FileEvent<HTMLInputElement>) => void;
  maxChars?: number;
  maxCharsWarningMessage?: string;
  autoFocus?: boolean;
  sendMessageSound?: boolean;
  sendSoundLocation?: string;
  enableInputHistory?: boolean;
  maxHistorySize?: number;
};

const defaultBackgroundColor = '#19191B';
const defaultTextColor = '#9E9E9E';
// CDN link for default send sound
const defaultSendSound = 'https://cdn.jsdelivr.net/gh/FlowiseAI/FlowiseChatEmbed@latest/src/assets/send_message.mp3';

export const TextInput = (props: TextInputProps) => {
  const [isSendButtonDisabled, setIsSendButtonDisabled] = createSignal(false);
  const [warningMessage, setWarningMessage] = createSignal('');
  const [inputHistory] = createSignal(new ChatInputHistory(() => props.maxHistorySize || 10));
  let inputRef: HTMLInputElement | HTMLTextAreaElement | undefined;
  let fileUploadRef: HTMLInputElement | HTMLTextAreaElement | undefined;
  let imgUploadRef: HTMLInputElement | HTMLTextAreaElement | undefined;
  let audioRef: HTMLAudioElement | undefined;

  const handleInput = (inputValue: string) => {
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

  const checkIfInputIsValid = () => warningMessage() === '' && inputRef?.reportValidity();

  const submit = () => {
    if (checkIfInputIsValid()) {
      if (props.enableInputHistory) {
        inputHistory().addToHistory(props.inputValue);
      }
      props.onSubmit(props.inputValue);
      if (props.sendMessageSound && audioRef) {
        audioRef.play();
      }
    }
  };

  const handleImageUploadClick = () => {
    if (imgUploadRef) imgUploadRef.click();
  };

  const handleFileUploadClick = () => {
    if (fileUploadRef) fileUploadRef.click();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
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
    const shouldAutoFocus = props.autoFocus !== undefined ? props.autoFocus : !isMobile() && window.innerWidth > 640;

    if (!props.disabled && shouldAutoFocus && inputRef) inputRef.focus();
  });

  onMount(() => {
    const shouldAutoFocus = props.autoFocus !== undefined ? props.autoFocus : !isMobile() && window.innerWidth > 640;

    if (!props.disabled && shouldAutoFocus && inputRef) inputRef.focus();

    if (props.sendMessageSound) {
      if (props.sendSoundLocation) {
        audioRef = new Audio(props.sendSoundLocation);
      } else {
        audioRef = new Audio(defaultSendSound);
      }
    }
  });

  const handleFileChange = (event: FileEvent<HTMLInputElement>) => {
    props.handleFileChange(event);
    if (event.target) event.target.value = '';
  };

  const getFileType = () => {
    if (props.isFullFileUpload) return '*';
    if (props.uploadsConfig?.fileUploadSizeAndTypes?.length) {
      const allowedFileTypes = props.uploadsConfig?.fileUploadSizeAndTypes.map((allowed) => allowed.fileTypes).join(',');
      if (allowedFileTypes.includes('*')) return '*';
      else return allowedFileTypes;
    }
    return '*';
  };

  return (
    <div
      class="w-full h-auto max-h-[192px] pb-9 md:pb-0 min-h-[54px] flex flex-col items-end justify-between"
      data-testid="input"
      style={{
        margin: 'auto',
        color: props.textColor ?? defaultTextColor,
      }}
      onKeyDown={handleKeyDown}
    >
      <Show when={warningMessage() !== ''}>
        <div class="w-full px-4 pt-4 pb-1 text-red-500 text-sm" data-testid="warning-message">
          {warningMessage()}
        </div>
      </Show>
      <div class="w-full flex items-end justify-between gap-4">
        {props.uploadsConfig?.isImageUploadAllowed ? (
          <>
            <ImageUploadButton
              buttonColor={props.sendButtonColor}
              type="button"
              class="m-0 h-14 flex items-center justify-center"
              isDisabled={props.disabled || isSendButtonDisabled()}
              on:click={handleImageUploadClick}
            >
              <span style={{ 'font-family': 'Poppins, sans-serif' }}>Image Upload</span>
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
              buttonColor={props.sendButtonColor}
              type="button"
              class="m-0 h-14 flex items-center justify-center"
              isDisabled={props.disabled || isSendButtonDisabled()}
              on:click={handleFileUploadClick}
            >
              <span style={{ 'font-family': 'Poppins, sans-serif' }}>File Upload</span>
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
        <ShortTextInput
          ref={inputRef as HTMLTextAreaElement}
          onInput={handleInput}
          value={props.inputValue}
          fontSize={props.fontSize}
          disabled={props.disabled}
          placeholder={props.placeholder ?? 'Спроси что-то'}
        />
        <RecordAudioButton
          buttonColor={props.sendButtonColor}
          type="button"
          class="absolute right-[92px] m-0 start-recording-button h-[54px] flex items-center justify-center"
          isDisabled={props.disabled || isSendButtonDisabled()}
          on:click={props.onMicrophoneClicked}
        >
          <span style={{ 'font-family': 'Poppins, sans-serif' }}>Record Audio</span>
        </RecordAudioButton>
        <SendButton
          sendButtonColor={props.sendButtonColor}
          type="button"
          isDisabled={props.disabled || isSendButtonDisabled()}
          active={props.inputValue.length > 0}
          class="m-0 h-[54px] flex items-center justify-center"
          on:click={submit}
        >
          <span style={{ 'font-family': 'Poppins, sans-serif' }}>Send</span>
        </SendButton>
      </div>
    </div>
  );
};
