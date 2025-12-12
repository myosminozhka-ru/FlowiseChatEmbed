import { createEffect, Show, createSignal, onMount, For, createMemo } from 'solid-js';
import { Avatar } from '../avatars/Avatar';
import { Marked } from '@ts-stack/markdown';
import { FeedbackRatingType, sendFeedbackQuery, sendFileDownloadQuery, updateFeedbackQuery } from '@/queries/sendMessageQuery';
import { FileUpload, IAction, MessageType } from '../Bot';
import { CopyToClipboardButton, ThumbsDownButton, ThumbsUpButton } from '../buttons/FeedbackButtons';
import FeedbackContentDialog from '../FeedbackContentDialog';
import { AgentReasoningBubble } from './AgentReasoningBubble';
import { SuccessAlert } from './SuccessAlert';
import { TickIcon, XIcon } from '../icons';
import { SourceBubble } from '../bubbles/SourceBubble';
import { DateTimeToggleTheme } from '@/features/bubble/types';
import { WorkflowTreeView } from '../treeview/WorkflowTreeView';
import { TypingBubble } from '../TypingBubble';
import { getLocalStorageChatflow, setLocalStorageChatflow } from '@/utils';

type Props = {
  message: MessageType;
  chatflowid: string;
  chatId: string;
  apiHost?: string;
  onRequest?: (request: RequestInit) => Promise<void>;
  fileAnnotations?: any;
  showAvatar?: boolean;
  avatarSrc?: string;
  chatFeedbackStatus?: boolean;
  fontSize?: number;
  feedbackColor?: string;
  isLoading: boolean;
  dateTimeToggle?: DateTimeToggleTheme;
  showAgentMessages?: boolean;
  sourceDocsTitle?: string;
  renderHTML?: boolean;
  botTitle?: string;
  enableCopyMessage?: boolean;
  handleActionClick: (elem: any, action: IAction | undefined | null) => void;
  onMessageAdd?: (message: MessageType) => void;
  handleSourceDocumentsClick: (src: any) => void;
  isFullPage?: boolean;
  isFullscreen?: boolean;
  isPopup?: boolean;
  feedbackReasons?: string[];
  userData?: { 
    fio?: string; 
    email?: string;
    user_name?: string;
    user_id?: string;
    login?: string;
    shortname?: string;
    orn?: string;
    phone?: string;
  };
  isOperatorConnected?: boolean; // Булевое значение о подключении оператора
};

const defaultFontSize = 'var(--chatbot-font-size, 16px)';
const defaultFeedbackColor = 'rgba(11, 17, 19, 0.5)'; // gray-500

export const BotBubble = (props: Props) => {
  let botDetailsEl: HTMLDetailsElement | undefined;

  // Функция для определения, является ли сообщение от оператора
  const isOperatorMessage = () => {
    if (!props.message.fileAnnotations) return false;
    try {
      const fileAnnotations =
        typeof props.message.fileAnnotations === 'string' ? JSON.parse(props.message.fileAnnotations) : props.message.fileAnnotations;
      const operatorInfo = Array.isArray(fileAnnotations)
        ? fileAnnotations.find((fa: any) => fa.sender === 'operator')
        : fileAnnotations?.sender === 'operator'
          ? fileAnnotations
          : null;
      // Оператор подключен, если есть operatorInfo (независимо от наличия имени/инициалов)
      return !!operatorInfo;
    } catch (e) {
      return false;
    }
  };

  // Определяем, какой аватар использовать: оператора или бота
  const avatarSrc = createMemo(() => {
    return isOperatorMessage() ? undefined : props.avatarSrc; // Для оператора используем OperatorAvatar компонент
  });

  Marked.setOptions({ isNoP: true, sanitize: props.renderHTML !== undefined ? !props.renderHTML : true });

  const [rating, setRating] = createSignal('');
  const [feedbackId, setFeedbackId] = createSignal('');
  const [showFeedbackContentDialog, setShowFeedbackContentModal] = createSignal(false);
  const [copiedMessage, setCopiedMessage] = createSignal(false);
  const [thumbsUpColor, setThumbsUpColor] = createSignal(props.feedbackColor ?? defaultFeedbackColor); // default color
  const [thumbsDownColor, setThumbsDownColor] = createSignal(props.feedbackColor ?? defaultFeedbackColor); // default color
  const [feedbackError, setFeedbackError] = createSignal('');
  const [showSuccessAlert, setShowSuccessAlert] = createSignal(false);

  // Store a reference to the bot message element for the copyMessageToClipboard function
  const [botMessageElement, setBotMessageElement] = createSignal<HTMLElement | null>(null);

  const setBotMessageRef = (el: HTMLSpanElement) => {
    if (el) {
      el.innerHTML = Marked.parse(props.message.message);

      // Цвета задаются через CSS переменные (не используем props.textColor)

      // Code blocks (with pre) get white text
      el.querySelectorAll('pre').forEach((element) => {
        (element as HTMLElement).style.color = '#FFFFFF';
        // Also ensure any code elements inside pre have white text
        element.querySelectorAll('code').forEach((codeElement) => {
          (codeElement as HTMLElement).style.color = '#FFFFFF';
        });
      });

      // Inline code (not in pre) gets green text
      el.querySelectorAll('code:not(pre code)').forEach((element) => {
        (element as HTMLElement).style.color = '#4CAF50'; // Green color
      });

      // Set target="_blank" for links
      el.querySelectorAll('a').forEach((link) => {
        link.target = '_blank';
      });

      // Store the element ref for the copy function
      setBotMessageElement(el);

      if (props.message.rating) {
        setRating(props.message.rating);
        if (props.message.rating === 'THUMBS_UP') {
          setThumbsUpColor('#006400');
        } else if (props.message.rating === 'THUMBS_DOWN') {
          setThumbsDownColor('#8B0000');
        }
      }
      if (props.fileAnnotations && props.fileAnnotations.length) {
        for (const annotations of props.fileAnnotations) {
          const button = document.createElement('button');
          button.textContent = annotations.fileName;
          button.className =
            'py-2 px-4 mb-2 justify-center font-semibold text-white focus:outline-none flex items-center disabled:opacity-50 disabled:cursor-not-allowed disabled:brightness-100 transition-all filter hover:brightness-90 active:brightness-75 file-annotation-button';
          button.addEventListener('click', function () {
            downloadFile(annotations);
          });
          const svgContainer = document.createElement('div');
          svgContainer.className = 'ml-2';
          svgContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-download" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="#ffffff" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" /><path d="M7 11l5 5l5 -5" /><path d="M12 4l0 12" /></svg>`;

          button.appendChild(svgContainer);
          el.appendChild(button);
        }
      }
    }
  };

  const downloadFile = async (fileAnnotation: any) => {
    try {
      const response = await sendFileDownloadQuery({
        apiHost: props.apiHost,
        body: { fileName: fileAnnotation.fileName, chatflowId: props.chatflowid, chatId: props.chatId } as any,
        onRequest: props.onRequest,
      });
      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileAnnotation.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const copyMessageToClipboard = async () => {
    try {
      const text = botMessageElement() ? botMessageElement()?.textContent : '';
      await navigator.clipboard.writeText(text || '');
      setCopiedMessage(true);
      setTimeout(() => {
        setCopiedMessage(false);
      }, 2000); // Hide the message after 2 seconds
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const saveToLocalStorage = (rating: FeedbackRatingType) => {
    const chatDetails = localStorage.getItem(`${props.chatflowid}_EXTERNAL`);
    if (!chatDetails) return;
    try {
      const parsedDetails = JSON.parse(chatDetails);
      const messages: MessageType[] = parsedDetails.chatHistory || [];
      const message = messages.find((msg) => msg.messageId === props.message.messageId);
      if (!message) return;
      message.rating = rating;
      localStorage.setItem(`${props.chatflowid}_EXTERNAL`, JSON.stringify({ ...parsedDetails, chatHistory: messages }));
    } catch (e) {
      return;
    }
  };

  const isValidURL = (url: string): URL | undefined => {
    try {
      return new URL(url);
    } catch (err) {
      return undefined;
    }
  };

  const removeDuplicateURL = (message: MessageType) => {
    const visitedURLs: string[] = [];
    const newSourceDocuments: any = [];

    message.sourceDocuments.forEach((source: any) => {
      if (isValidURL(source.metadata.source) && !visitedURLs.includes(source.metadata.source)) {
        visitedURLs.push(source.metadata.source);
        newSourceDocuments.push(source);
      } else if (!isValidURL(source.metadata.source)) {
        newSourceDocuments.push(source);
      }
    });
    return newSourceDocuments;
  };

  const onThumbsUpClick = async () => {
    if (rating() === '') {
      const messageId = props.message?.messageId || props.message?.id || '';
      const body = {
        chatflowid: props.chatflowid,
        chatId: props.chatId,
        messageId: messageId,
        rating: 'THUMBS_UP' as FeedbackRatingType,
        content: '',
        ...(props.userData?.email && { email: props.userData.email }),
      };
      const result = await sendFeedbackQuery({
        chatflowid: props.chatflowid,
        apiHost: props.apiHost,
        body,
        onRequest: props.onRequest,
      });

      if (result.data) {
        const data = result.data as any;
        let id = '';
        if (data && data.id) id = data.id;
        setRating('THUMBS_UP');
        setFeedbackId(id);
        setThumbsUpColor('#006400');
        saveToLocalStorage('THUMBS_UP');
      }
    }
  };

  const onThumbsDownClick = async () => {
    if (rating() === '') {
      const messageId = props.message?.messageId || props.message?.id || '';
      const body = {
        chatflowid: props.chatflowid,
        chatId: props.chatId,
        messageId: messageId,
        rating: 'THUMBS_DOWN' as FeedbackRatingType,
        content: '',
        ...(props.userData?.email && { email: props.userData.email }),
      };
      const result = await sendFeedbackQuery({
        chatflowid: props.chatflowid,
        apiHost: props.apiHost,
        body,
        onRequest: props.onRequest,
      });

      if (result.data) {
        const data = result.data as any;
        let id = '';
        if (data && data.id) id = data.id;
        setRating('THUMBS_DOWN');
        setFeedbackId(id);
        setShowFeedbackContentModal(true);
        setThumbsDownColor('#8B0000');
        saveToLocalStorage('THUMBS_DOWN');
      } else if (result.error) {
        setFeedbackError('Произошла ошибка, попробуйте еще раз');
        setShowFeedbackContentModal(true);
      }
    }
  };

  const submitFeedbackContent = async (text: string, reason?: string) => {
    setFeedbackError('');

    let content = text;
    if (reason && reason !== 'Другое') {
      content = reason + (text ? `: ${text}` : '');
    }

    const body = {
      content: content,
    };
    const result = await updateFeedbackQuery({
      id: feedbackId(),
      apiHost: props.apiHost,
      body,
      onRequest: props.onRequest,
    });

    if (result.data) {
      setFeedbackId('');
      setShowFeedbackContentModal(false);
      setShowSuccessAlert(true);
    } else if (result.error) {
      setFeedbackError('Произошла ошибка, попробуйте еще раз');
    }
  };

  onMount(() => {
    if (botDetailsEl && props.isLoading) {
      botDetailsEl.open = true;
    }
  });

  createEffect(() => {
    if (botDetailsEl && props.isLoading) {
      botDetailsEl.open = true;
    } else if (botDetailsEl && !props.isLoading) {
      botDetailsEl.open = false;
    }
  });

  const renderArtifacts = (item: Partial<FileUpload>) => {
    // Instead of onMount, we'll use a callback ref to apply styles
    const setArtifactRef = (el: HTMLSpanElement) => {
      if (el) {
        // Цвета задаются через CSS переменные (не используем props.textColor)

        // Code blocks (with pre) get white text
        el.querySelectorAll('pre').forEach((element) => {
          (element as HTMLElement).style.color = '#FFFFFF';
          // Also ensure any code elements inside pre have white text
          element.querySelectorAll('code').forEach((codeElement) => {
            (codeElement as HTMLElement).style.color = '#FFFFFF';
          });
        });

        // Inline code (not in pre) gets green text
        el.querySelectorAll('code:not(pre code)').forEach((element) => {
          (element as HTMLElement).style.color = '#4CAF50'; // Green color
        });

        el.querySelectorAll('a').forEach((link) => {
          link.target = '_blank';
        });
      }
    };

    return (
      <>
        <Show when={item.type === 'png' || item.type === 'jpeg'}>
          <div class="flex items-center justify-center p-0 m-0">
            <img
              class="w-full h-full bg-cover"
              src={(() => {
                const isFileStorage = typeof item.data === 'string' && item.data.startsWith('FILE-STORAGE::');
                return isFileStorage
                  ? `${props.apiHost}/api/v1/get-upload-file?chatflowId=${props.chatflowid}&chatId=${props.chatId}&fileName=${(
                      item.data as string
                    ).replace('FILE-STORAGE::', '')}`
                  : (item.data as string);
              })()}
            />
          </div>
        </Show>
        <Show when={item.type === 'html'}>
          <div class="mt-2">
            <div innerHTML={item.data as string} />
          </div>
        </Show>
        <Show when={item.type !== 'png' && item.type !== 'jpeg' && item.type !== 'html'}>
          <span
            ref={setArtifactRef}
            innerHTML={Marked.parse(item.data as string)}
            class="prose rounded-lg chatbot-host-bubble bg-[var(--chatbot-host-bubble-bg-color)] text-[var(--chatbot-host-bubble-text-color)]"
            style={{
              'font-size': props.fontSize ? `${props.fontSize}px` : defaultFontSize,
            }}
          />
        </Show>
      </>
    );
  };

  const formatDateTime = (dateTimeString: string | undefined, showDate: boolean | undefined, showTime: boolean | undefined) => {
    if (!dateTimeString) return '';

    try {
      const date = new Date(dateTimeString);

      // Check if the date is valid
      if (isNaN(date.getTime())) {
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
      return '';
    }
  };

  // Определяем классы для ширины бабла в зависимости от режима и размера экрана
  const getContainerClasses = () => {
    const isFullMode = props.isFullPage || props.isFullscreen;
    const isPopupMode = props.isPopup && !props.isFullscreen;
    const baseClasses = 'flex flex-row justify-start mb-5 items-start host-container';

    if (isPopupMode) {
      return `${baseClasses} w-full pr-[40px]`;
    }

    if (isFullMode) {
      // Для full page/full screen - адаптивные стили: 100% (до sm) -> 70% (sm:640px) -> 60% (lg:1024px) -> 50% (xl:1280px)
      return `${baseClasses} w-full pr-[40px] sm:w-[70%] sm:pr-0 lg:w-3/5 xl:w-1/2`;
    }

    // По умолчанию
    return `${baseClasses} w-2/3`;
  };

  return (
    <div>
      <div class={getContainerClasses()}>
        {/* Основной контейнер с контентом */}
        <div
          class={`flex flex-col justify-start px-4 py-3 rounded-lg rounded-bl-none chatbot-host-bubble min-h-[52px] bg-[var(--chatbot-host-bubble-bg-color)] text-[var(--chatbot-host-bubble-text-color)] ${
            props.isLoading && !props.message.message ? 'w-[72px]' : 'w-full'
          }`}
          style={{
            'font-size': isOperatorMessage()
              ? props.fontSize
                ? `${Math.max(props.fontSize * 0.85, 12)}px`
                : '13.6px' // Уменьшаем шрифт на 15% для оператора, минимум 12px
              : props.fontSize
                ? `${props.fontSize}px`
                : defaultFontSize,
          }}
        >
          {/* Верхняя строка: Аватар, название бота и Feedback кнопки - показываем только когда есть текст сообщения */}
          <Show when={props.message.message}>
            <div class="flex flex-row items-center justify-between w-full mb-2">
              <div class="flex flex-row items-center gap-2">
                <Show when={props.showAvatar}>
                  <Avatar initialAvatarSrc={avatarSrc()} isOperator={isOperatorMessage()} />
                </Show>
                <Show
                  when={isOperatorMessage()}
                  fallback={<span class="font-semibold text-gray-880">{props.botTitle || 'Умный помощник'}</span>}
                >
                  {(() => {
                    try {
                      const fileAnnotations =
                        typeof props.message.fileAnnotations === 'string' ? JSON.parse(props.message.fileAnnotations) : props.message.fileAnnotations;
                      const operatorInfo = Array.isArray(fileAnnotations)
                        ? fileAnnotations.find((fa: any) => fa.sender === 'operator')
                        : fileAnnotations?.sender === 'operator'
                          ? fileAnnotations
                          : null;

                      // Если оператор подключен, показываем "Оператор" (с именем/инициалами если есть)
                      if (operatorInfo) {
                        const operatorText = operatorInfo.operatorInitials
                          ? `Оператор ${operatorInfo.operatorInitials}${operatorInfo.operatorName ? ` (${operatorInfo.operatorName})` : ''}`
                          : operatorInfo.operatorName
                            ? `Оператор ${operatorInfo.operatorName}`
                            : 'Оператор';
                        return <span class="font-semibold text-gray-880 text-sm">{operatorText}</span>;
                      }
                      // Fallback на botTitle (не должно сюда попасть, т.к. isOperatorMessage() уже проверил)
                      return <span class="font-semibold text-gray-880">{props.botTitle || 'Умный помощник'}</span>;
                    } catch (e) {
                      return <span class="font-semibold text-gray-880">{props.botTitle || 'Умный помощник'}</span>;
                    }
                  })()}
                </Show>
              </div>
              {/* Feedback кнопки справа - показываем только если chatFeedbackStatus === true */}
              <div class="flex items-center gap-2">
                <Show when={props.enableCopyMessage}>
                  <CopyToClipboardButton feedbackColor={props.feedbackColor} onClick={() => copyMessageToClipboard()} />
                  <Show when={copiedMessage()}>
                    <div class={`copied-message text-xs ${props.feedbackColor ? `text-[${props.feedbackColor}]` : 'text-gray-500'}`}>Скопировано</div>
                  </Show>
                </Show>
                {/* Кнопки фидбека - показываем только если chatFeedbackStatus === true и disableFeedback !== true */}
                <Show when={props.chatFeedbackStatus && !isOperatorMessage() && !props.message.disableFeedback}>
                  {rating() === '' || rating() === 'THUMBS_UP' ? (
                    <ThumbsUpButton feedbackColor={thumbsUpColor()} isDisabled={rating() === 'THUMBS_UP'} rating={rating()} onClick={onThumbsUpClick} />
                  ) : null}
                  {rating() === '' || rating() === 'THUMBS_DOWN' ? (
                    <ThumbsDownButton
                      feedbackColor={thumbsDownColor()}
                      isDisabled={rating() === 'THUMBS_DOWN'}
                      rating={rating()}
                      onClick={onThumbsDownClick}
                    />
                  ) : null}
                </Show>
              </div>
            </div>
          </Show>
          {/* Agent Flow Executed Data блок */}
          {props.showAgentMessages &&
            props.message.agentFlowExecutedData &&
            Array.isArray(props.message.agentFlowExecutedData) &&
            props.message.agentFlowExecutedData.length > 0 && (
              <div>
                <WorkflowTreeView workflowData={props.message.agentFlowExecutedData} indentationLevel={24} />
              </div>
            )}
          {/* Agent Reasoning блок */}
          {props.showAgentMessages && props.message.agentReasoning && (
            <details ref={botDetailsEl} class="mb-2 px-4 py-2 ml-2 chatbot-host-bubble rounded-[6px]">
              <summary class="cursor-pointer">
                <span class="italic">Agent Messages</span>
              </summary>
              <br />
              <For each={props.message.agentReasoning}>
                {(agent) => {
                  const agentMessages = agent.messages ?? [];
                  let msgContent = agent.instructions || (agentMessages.length > 1 ? agentMessages.join('\\n') : agentMessages[0]);
                  if (agentMessages.length === 0 && !agent.instructions) msgContent = `<p>Finished</p>`;
                  return (
                    <AgentReasoningBubble
                      agentName={agent.agentName ?? ''}
                      agentMessage={msgContent}
                      agentArtifacts={agent.artifacts}
                      fontSize={props.fontSize}
                      apiHost={props.apiHost}
                      chatflowid={props.chatflowid}
                      chatId={props.chatId}
                      renderHTML={props.renderHTML}
                    />
                  );
                }}
              </For>
            </details>
          )}
          {/* Artifacts блок */}
          {props.message.artifacts && props.message.artifacts.length > 0 && (
            <div class="flex flex-row items-start flex-wrap w-full gap-2">
              <For each={props.message.artifacts}>
                {(item) => {
                  return item !== null ? <>{renderArtifacts(item)}</> : null;
                }}
              </For>
            </div>
          )}
          {/* Основное сообщение бота или индикатор загрузки */}
          {props.message.message ? (
            <span
              ref={setBotMessageRef}
              class="mt-3 max-w-full prose overflow-hidden"
              data-testid="host-bubble"
            />
          ) : props.isLoading ? (
            <div class="mt-3">
              <TypingBubble />
            </div>
          ) : null}
          {/* Action кнопки (Yes/No) */}
          {props.message.action && (
            <div class="px-4 py-2 flex flex-row justify-start space-x-2">
              <For each={props.message.action.elements || []}>
                {(action) => {
                  return (
                    <>
                      {(action.type === 'approve-button' && action.label === 'Yes') || action.type === 'agentflowv2-approve-button' ? (
                        <button
                          type="button"
                          class="px-4 py-2 font-medium text-green-600 border border-green-600 rounded-full hover:bg-green-600 hover:text-white transition-colors duration-300 flex items-center space-x-2"
                          onClick={() => props.handleActionClick(action, props.message.action)}
                        >
                          <TickIcon />
                          &nbsp;
                          {action.label}
                        </button>
                      ) : (action.type === 'reject-button' && action.label === 'No') || action.type === 'agentflowv2-reject-button' ? (
                        <button
                          type="button"
                          class="px-4 py-2 font-medium text-red-600 border border-red-600 rounded-full hover:bg-red-600 hover:text-white transition-colors duration-300 flex items-center space-x-2"
                          onClick={() => props.handleActionClick(action, props.message.action)}
                        >
                          <XIcon />
                          &nbsp;
                          {action.label}
                        </button>
                      ) : (
                        <button>{action.label}</button>
                      )}
                    </>
                  );
                }}
              </For>
            </div>
          )}
          {/* Время внизу бабла - справа (скрываем во время загрузки) */}
          {props.message.dateTime && !(props.isLoading && !props.message.message) && (
            <div class="text-xs text-gray-500 opacity-70 mt-2 w-full text-right">
              {formatDateTime(props.message.dateTime, props?.dateTimeToggle?.date, props?.dateTimeToggle?.time)}
            </div>
          )}
        </div>
      </div>
      {/* Source Documents блок */}
      <div>
        {props.message.sourceDocuments && props.message.sourceDocuments.length && (
          <>
            <Show when={props.sourceDocsTitle}>
              <span class="px-2 py-[10px] font-semibold">{props.sourceDocsTitle}</span>
            </Show>
            <div style={{ display: 'flex', 'flex-direction': 'row', width: '100%', 'flex-wrap': 'wrap' }}>
              <For each={[...removeDuplicateURL(props.message)]}>
                {(src) => {
                  const URL = isValidURL(src.metadata.source);
                  return (
                    <SourceBubble
                      pageContent={URL ? URL.pathname : src.pageContent}
                      metadata={src.metadata}
                      onSourceClick={() => {
                        if (URL) {
                          window.open(src.metadata.source, '_blank');
                        } else {
                          props.handleSourceDocumentsClick(src);
                        }
                      }}
                    />
                  );
                }}
              </For>
            </div>
          </>
        )}
      </div>
      {/* Feedback Dialog */}
      <Show when={showFeedbackContentDialog()}>
        <FeedbackContentDialog
          isOpen={showFeedbackContentDialog()}
          onClose={() => {
            setShowFeedbackContentModal(false);
            setFeedbackError('');
          }}
          onSubmit={submitFeedbackContent}
          reasons={props.feedbackReasons}
          errorMessage={feedbackError()}
          onErrorClear={() => setFeedbackError('')}
          chatflowid={props.chatflowid}
          chatId={props.chatId}
          apiHost={props.apiHost}
          onRequest={props.onRequest}
          onMessageAdd={props.onMessageAdd}
          userData={props.userData}
          isFullPage={props.isFullPage}
          isOperatorConnected={props.isOperatorConnected}
        />
      </Show>
      {/* Success Alert */}
      <SuccessAlert isOpen={showSuccessAlert()} onClose={() => setShowSuccessAlert(false)} message="Ваше сообщение отправлено." />
    </div>
  );
};
