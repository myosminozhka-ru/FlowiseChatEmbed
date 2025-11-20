import { For, Show, onMount, createEffect, createSignal } from 'solid-js';
import { Avatar } from '../avatars/Avatar';
import { Marked } from '@ts-stack/markdown';
import { FileUpload, MessageType } from '../Bot';
import { AttachmentIcon } from '../icons';
import { DateTimeToggleTheme } from '@/features/bubble/types';
import { CopyToClipboardButton } from '../buttons/FeedbackButtons';

type Props = {
  message: MessageType;
  apiHost?: string;
  chatflowid: string;
  chatId: string;
  showAvatar?: boolean;
  avatarSrc?: string;
  fontSize?: number;
  renderHTML?: boolean;
  dateTimeToggle?: DateTimeToggleTheme;
  isFullPage?: boolean;
  isFullscreen?: boolean;
  isPopup?: boolean;
  enableCopyMessage?: boolean;
  feedbackReasons?: string[];
  userName?: string; // Имя пользователя (fio) для отображения в bubble
};

const defaultFontSize = 16;

const formatDateTime = (dateTimeString: string | undefined, showDate: boolean | undefined, showTime: boolean | undefined) => {
  if (!dateTimeString) return '';

  try {
    const date = new Date(dateTimeString);

    // Check if the date is valid
    if (isNaN(date.getTime())) {
      console.error('Invalid ISO date string:', dateTimeString);
      return '';
    }

    // В баблах показываем только время, дата остается в разделителе
    const shouldShowTime = showTime !== false; // По умолчанию true, если не false

    let formatted = '';

    // Показываем только время
    if (shouldShowTime) {
      const timeFormatter = new Intl.DateTimeFormat('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      formatted = timeFormatter.format(date);
    }

    return formatted;
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

export const GuestBubble = (props: Props) => {
  Marked.setOptions({ isNoP: true, sanitize: props.renderHTML !== undefined ? !props.renderHTML : true });

  let userMessageEl: HTMLSpanElement | undefined;

  const [copiedMessage, setCopiedMessage] = createSignal(false);

  // Effect to set innerHTML when element or message changes
  createEffect(() => {
    if (userMessageEl && props.message.message) {
      userMessageEl.innerHTML = Marked.parse(props.message.message);

      // Code blocks (with pre) get white text
      userMessageEl.querySelectorAll('pre').forEach((element) => {
        (element as HTMLElement).style.color = '#FFFFFF';
        // Also ensure any code elements inside pre have white text
        element.querySelectorAll('code').forEach((codeElement) => {
          (codeElement as HTMLElement).style.color = '#FFFFFF';
        });
      });

      // Inline code (not in pre) gets green text
      userMessageEl.querySelectorAll('code:not(pre code)').forEach((element) => {
        (element as HTMLElement).style.color = '#4CAF50'; // Green color
      });

      // Set target="_blank" for links
      userMessageEl.querySelectorAll('a').forEach((link) => {
        link.target = '_blank';
      });
    }
  });

  const copyMessageToClipboard = async () => {
    try {
      const text = userMessageEl?.textContent || '';
      await navigator.clipboard.writeText(text);
      setCopiedMessage(true);
      setTimeout(() => {
        setCopiedMessage(false);
      }, 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const renderFileUploads = (item: Partial<FileUpload>) => {
    if (item?.mime?.startsWith('image/')) {
      const fileData = `${props.apiHost}/api/v1/get-upload-file?chatflowId=${props.chatflowid}&chatId=${props.chatId}&fileName=${item.name}`;
      const src = (item.data as string) ?? fileData;
      return (
        <div class="flex items-center justify-center max-w-[128px] mr-[10px] p-0 m-0">
          <img class="w-full h-full bg-cover" src={src} />
        </div>
      );
    } else {
      return (
        <div class={`inline-flex items-center h-12 max-w-max p-2 mr-1 flex-none bg-transparent border border-gray-300 rounded-md`}>
          <AttachmentIcon color="var(--chatbot-guest-bubble-text-color, #2D3537)" />
          <span class={`ml-1.5 text-inherit`}>{item.name}</span>
        </div>
      );
    }
  };

  // Определяем классы для ширины бабла в зависимости от режима и размера экрана
  const getContainerClasses = () => {
    const isFullMode = props.isFullPage || props.isFullscreen;
    const isPopupMode = props.isPopup && !props.isFullscreen;
    const baseClasses = 'flex justify-end mb-5 items-end guest-container ml-auto';

    if (isPopupMode) {
      // Для поп-апа не развернутого - мобильные стили (100% с отступом справа 40px)
      return `${baseClasses} w-full pl-[40px]`;
    }

    if (isFullMode) {
      // Для full page/full screen - адаптивные стили: 100% (до sm) -> 70% (sm:640px) -> 60% (lg:1024px) -> 50% (xl:1280px)
      return `${baseClasses} w-full pl-[40px] sm:w-[70%] sm:pl-0 lg:w-3/5 xl:w-1/2 me-[24px]`;
    }

    // По умолчанию
    return `${baseClasses} w-2/3 me-[24px]`;
  };

  return (
    <div class={getContainerClasses()}>
      <div class="flex flex-col items-end mr-2">
        {/* Отображаем имя пользователя над сообщением, если оно есть и не "Гость" */}
        <Show when={props.userName && props.userName !== 'Гость'}>
          <span
            class="text-xs mb-1 opacity-75 text-[var(--chatbot-guest-bubble-text-color)]"
            style={{
              'font-size': props.fontSize ? `${(props.fontSize * 0.75).toFixed(0)}px` : '12px',
            }}
          >
            {props.userName}
          </span>
        </Show>
        <div
          class="max-w-full flex flex-col justify-center items-start chatbot-guest-bubble min-h-[52px] px-4 py-2 gap-2 rounded-lg rounded-br-none bg-[var(--chatbot-guest-bubble-bg-color)] text-[var(--chatbot-guest-bubble-text-color)]"
          data-testid="guest-bubble"
        >
        {props.message.fileUploads && props.message.fileUploads.length > 0 && (
          <div class="flex flex-col items-start flex-wrap w-full gap-2">
            <For each={props.message.fileUploads}>
              {(item) => {
                return renderFileUploads(item);
              }}
            </For>
          </div>
        )}
        {props.message.message && (
          <span
            ref={userMessageEl}
            class="mr-2 whitespace-pre-wrap"
            style={{ 'font-size': props.fontSize ? `${props.fontSize}px` : `${defaultFontSize}px` }}
          />
        )}
        {/* Кнопка копирования */}
        <Show when={props.enableCopyMessage}>
          <div class="flex items-center gap-2 mt-2">
            <CopyToClipboardButton feedbackColor="rgba(11, 17, 19, 0.5)" onClick={() => copyMessageToClipboard()} />
            <Show when={copiedMessage()}>
              <div class="copied-message text-xs text-gray-500">Скопировано</div>
            </Show>
          </div>
        </Show>
        {/* Время */}
        {props.message.dateTime && (
          <div class="text-xs text-gray-500 opacity-70 w-full">
            {formatDateTime(props.message.dateTime, props?.dateTimeToggle?.date, props?.dateTimeToggle?.time)}
          </div>
        )}
        </div>
      </div>
      <Show when={props.showAvatar}>
        <Avatar initialAvatarSrc={props.avatarSrc} />
      </Show>
    </div>
  );
};
