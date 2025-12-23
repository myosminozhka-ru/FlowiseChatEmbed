import {createEffect, createMemo, createSignal, For, mergeProps, onMount, Show} from 'solid-js';
import {v4 as uuidv4} from 'uuid';
import {
  createAttachmentWithFormData,
  FeedbackRatingType,
  getChatbotConfig,
  getChatMessagesQuery,
  IncomingInput,
  isStreamAvailableQuery,
  sendMessageQuery,
  transferChatHistoryToAutoFAQ,
  upsertVectorStoreWithFormData,
} from '@/queries/sendMessageQuery';
import {SendArea} from './SendArea';
import {GuestBubble} from './bubbles/GuestBubble';
import {BotBubble} from './bubbles/BotBubble';
import {DateDivider} from './DateDivider';
import {
  BotMessageTheme,
  DateTimeToggleTheme,
  DisclaimerPopUpTheme,
  FeedbackTheme,
  FooterTheme,
  TextInputTheme,
  UserMessageTheme,
} from '@/features/bubble/types';
import {Badge} from './Badge';
import {DisclaimerPopup, Popup} from '@/features/popup';
import {DeleteButton} from '@/components/buttons/DeleteButton';
import {IconButton} from '@/components/buttons/IconButton';
import {FilePreview} from '@/components/inputs/textInput/components/FilePreview';
import {ResizeIcon, SparklesIcon, TrashIcon, XIcon} from './icons';
import {LeadCaptureBubble} from '@/components/bubbles/LeadCaptureBubble';
import {
  deleteCookie,
  getCookie,
  getLocalStorageChatflow,
  getUserDataWithAuth,
  removeLocalStorageChatHistory,
  setCookie,
  setLocalStorageChatflow,
} from '@/utils';
import {cloneDeep} from 'lodash';
import {FollowUpPromptBubble} from '@/components/bubbles/FollowUpPromptBubble';
import {EventStreamContentType, fetchEventSource} from '@microsoft/fetch-event-source';
import {WelcomeMessage} from '@/components/bubbles/WelcomeMessage';
import {ServiceErrorScreen} from './ServiceErrorScreen';

export type FileEvent<T = EventTarget> = {
  target: T;
};

export type FormEvent<T = EventTarget> = {
  preventDefault: () => void;
  currentTarget: T;
};

type IUploadConstraits = {
  fileTypes: string[];
  maxUploadSize: number;
};

export type UploadsConfig = {
  imgUploadSizeAndTypes: IUploadConstraits[];
  fileUploadSizeAndTypes: IUploadConstraits[];
  isImageUploadAllowed: boolean;
  isRAGFileUploadAllowed: boolean;
};

type FilePreviewData = string | ArrayBuffer;

type FilePreview = {
  data: FilePreviewData;
  mime: string;
  name: string;
  preview: string;
  type: string;
};

type messageType = 'apiMessage' | 'userMessage' | 'usermessagewaiting' | 'leadCaptureMessage';
type ExecutionState = 'INPROGRESS' | 'FINISHED' | 'ERROR' | 'TERMINATED' | 'TIMEOUT' | 'STOPPED';

export type IAgentReasoning = {
  agentName?: string;
  messages?: string[];
  usedTools?: any[];
  artifacts?: FileUpload[];
  sourceDocuments?: any[];
  instructions?: string;
  nextAgent?: string;
};

export type IAction = {
  id?: string;
  data?: any;
  elements?: Array<{
    type: string;
    label: string;
  }>;
  mapping?: {
    approve: string;
    reject: string;
    toolCalls: any[];
  };
};

export type FileUpload = Omit<FilePreview, 'preview'>;

export type AgentFlowExecutedData = {
  nodeLabel: string;
  nodeId: string;
  data: any;
  previousNodeIds: string[];
  status?: ExecutionState;
};

export type MessageType = {
  messageId?: string;
  message: string;
  type: messageType;
  welcomeTitle?: string;
  welcomeText?: string;
  sourceDocuments?: any;
  fileAnnotations?: any;
  fileUploads?: Partial<FileUpload>[];
  artifacts?: Partial<FileUpload>[];
  agentReasoning?: IAgentReasoning[];
  execution?: any;
  agentFlowEventStatus?: string;
  agentFlowExecutedData?: any;
  usedTools?: any[];
  action?: IAction | null;
  rating?: FeedbackRatingType;
  id?: string;
  followUpPrompts?: string;
  dateTime?: string;
  disableFeedback?: boolean; // Если true, кнопки фидбэка не будут отображаться для этого сообщения
};

type IUploads = {
  data: FilePreviewData;
  type: string;
  name: string;
  mime: string;
}[];

type observerConfigType = (accessor: string | boolean | object | MessageType[]) => void;
export type observersConfigType = Record<'observeUserInput' | 'observeLoading' | 'observeMessages', observerConfigType>;

export type BotProps = {
  chatflowid: string;
  apiHost?: string;
  apiKey?: string;
  onRequest?: (request: RequestInit) => Promise<void>;
  chatflowConfig?: Record<string, unknown>;
  welcomeTitle?: string;
  welcomeText?: string;
  assistantGreeting?: string;
  showWelcomeImage?: boolean;
  errorMessage?: string;
  botMessage?: BotMessageTheme;
  userMessage?: UserMessageTheme;
  textInput?: TextInputTheme;
  feedback?: FeedbackTheme;
  showTitle?: boolean;
  showAgentMessages?: boolean;
  title?: string;
  titleAvatarSrc?: string;
  fontSize?: number;
  isFullPage?: boolean;
  footer?: FooterTheme;
  sourceDocsTitle?: string;
  observersConfig?: observersConfigType;
  starterPrompts?: string[] | Record<string, { prompt: string }>;
  clearChatOnReload?: boolean;
  disclaimer?: DisclaimerPopUpTheme;
  dateTimeToggle?: DateTimeToggleTheme;
  renderHTML?: boolean;
  closeBot?: () => void;
  enableCopyMessage?: boolean;
  showBadge?: boolean;
  toggleFullscreen?: () => void;
  isFullscreen?: boolean;
};

export type LeadsConfig = {
  status: boolean;
  title?: string;
  name?: boolean;
  email?: boolean;
  phone?: boolean;
  successMessage?: string;
};

const defaultBackgroundColor = 'var(--chatbot-container-bg-color)';
const defaultTextColor = 'var(--chatbot-text-bg-color)';
const defaultTitleBackgroundColor = 'var(--chatbot-title-bg-color)';

const defaultWelcomeTitle = 'Привет! Я ваш виртуальный ассистент от Фонда «Сколково».';
const defaultWelcomeText = 'Задавайте мне вопросы об экосистеме так, словно обращаетесь к сотруднику Сколково.';
const defaultAssistantGreeting = 'Я ваш AI-ассистент. Чем могу помочь?';

/* FeedbackDialog component - for collecting user feedback */
const FeedbackDialog = (props: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  feedbackValue: string;
  setFeedbackValue: (value: string) => void;
}) => {
  return (
    <Show when={props.isOpen}>
      <div class="fixed inset-0 rounded-lg flex items-center justify-center backdrop-blur-sm z-50" style={{ background: 'rgba(0, 0, 0, 0.4)' }}>
        <div class="p-6 rounded-lg shadow-lg max-w-md w-full text-center mx-4 font-sans" style={{ background: 'white', color: 'black' }}>
          <h2 class="text-xl font-semibold mb-4 flex justify-center items-center">Your Feedback</h2>

          <textarea
            class="w-full p-2 border border-gray-300 rounded-md mb-4"
            rows={4}
            placeholder="Please provide your feedback..."
            value={props.feedbackValue}
            onInput={(e) => props.setFeedbackValue(e.target.value)}
          />

          <div class="flex justify-center space-x-4">
            <button
              class="font-bold py-2 px-6 rounded focus:outline-none focus:shadow-outline"
              style={{ background: '#ef4444', color: 'white' }}
              onClick={props.onClose}
            >
              Cancel
            </button>
            <button
              class="font-bold py-2 px-6 rounded focus:outline-none focus:shadow-outline"
              style={{ background: '#3b82f6', color: 'white' }}
              onClick={props.onSubmit}
            >
              Submit
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
};

/* FormInputView component - for displaying the form input */
const FormInputView = (props: {
  title: string;
  description: string;
  inputParams: any[];
  onSubmit: (formData: object) => void;
  fontSize?: number;
}) => {
  const [formData, setFormData] = createSignal<Record<string, any>>({});

  const handleInputChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    props.onSubmit(formData());
  };

  return (
    <div
      class="w-full h-full flex flex-col items-center justify-center px-4 py-8 rounded-lg font-sans"
      style={{
        'font-size': props.fontSize ? `${props.fontSize}px` : '16px',
      }}
    >
      <div
        class="w-full max-w-md bg-white shadow-lg rounded-lg overflow-hidden font-sans"
        style={{
          'font-size': props.fontSize ? `${props.fontSize}px` : '16px',
          background: defaultBackgroundColor,
        }}
      >
        <div class="p-6">
          <h2 class="text-xl font-bold mb-2">{props.title}</h2>
          {props.description && <p class="text-gray-600 mb-6">{props.description}</p>}

          <form onSubmit={handleSubmit} class="space-y-4">
            <For each={props.inputParams}>
              {(param) => (
                <div class="space-y-2">
                  <label class="block text-sm font-medium">{param.label}</label>

                  {param.type === 'string' && (
                    <input
                      type="text"
                      class="w-full px-3 py-2 rounded-md focus:outline-none"
                      style={{
                        border: '1px solid #9ca3af',
                        'border-radius': '0.375rem',
                      }}
                      onFocus={(e) => (e.target.style.border = '1px solid #3b82f6')}
                      onBlur={(e) => (e.target.style.border = '1px solid #9ca3af')}
                      name={param.name}
                      onInput={(e) => handleInputChange(param.name, e.target.value)}
                      required
                    />
                  )}

                  {param.type === 'number' && (
                    <input
                      type="number"
                      class="w-full px-3 py-2 rounded-md focus:outline-none"
                      style={{
                        border: '1px solid #9ca3af',
                        'border-radius': '0.375rem',
                      }}
                      onFocus={(e) => (e.target.style.border = '1px solid #3b82f6')}
                      onBlur={(e) => (e.target.style.border = '1px solid #9ca3af')}
                      name={param.name}
                      onInput={(e) => handleInputChange(param.name, parseFloat(e.target.value))}
                      required
                    />
                  )}

                  {param.type === 'boolean' && (
                    <div class="flex items-center">
                      <input
                        type="checkbox"
                        class="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                        style={{
                          border: '1px solid #9ca3af',
                        }}
                        name={param.name}
                        onChange={(e) => handleInputChange(param.name, e.target.checked)}
                      />
                      <span class="ml-2">Yes</span>
                    </div>
                  )}

                  {param.type === 'options' && (
                    <select
                      class="w-full px-3 py-2 rounded-md focus:outline-none"
                      style={{
                        border: '1px solid #9ca3af',
                        'border-radius': '0.375rem',
                      }}
                      onFocus={(e) => (e.target.style.border = '1px solid #3b82f6')}
                      onBlur={(e) => (e.target.style.border = '1px solid #9ca3af')}
                      name={param.name}
                      onChange={(e) => handleInputChange(param.name, e.target.value)}
                      required
                    >
                      <option value="">Select an option</option>
                      <For each={param.options}>{(option) => <option value={option.name}>{option.label}</option>}</For>
                    </select>
                  )}
                </div>
              )}
            </For>

            <div class="pt-4">
              <button
                type="submit"
                class="w-full py-2 px-4 text-white font-semibold rounded-md focus:outline-none transition duration-300 ease-in-out bg-blue-500 hover:bg-blue-600"
              >
                Submit
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export const Bot = (botProps: BotProps & { class?: string }) => {
  // set default values for props that should be enabled unless explicitly disabled
  const props = mergeProps({ showTitle: true, renderHTML: true }, botProps);
  let chatContainer: HTMLDivElement | undefined;
  let bottomSpacer: HTMLDivElement | undefined;
  let botContainer: HTMLDivElement | undefined;

  const [userInput, setUserInput] = createSignal('');
  const [loading, setLoading] = createSignal(false);
  const [sourcePopupOpen, setSourcePopupOpen] = createSignal(false);
  const [sourcePopupSrc, setSourcePopupSrc] = createSignal({});
  const [messages, setMessages] = createSignal<MessageType[]>([], { equals: false });

  // Проверяем, подключен ли оператор (последнее сообщение от оператора)
  const isOperatorConnected = createMemo(() => {
    const currentMessages = messages();
    if (currentMessages.length === 0) return false;

    const lastMessage = currentMessages[currentMessages.length - 1];
    if (lastMessage && lastMessage.fileAnnotations) {
      try {
        const fileAnnotations = typeof lastMessage.fileAnnotations === 'string'
          ? JSON.parse(lastMessage.fileAnnotations)
          : lastMessage.fileAnnotations;
        const operatorInfo = Array.isArray(fileAnnotations)
          ? fileAnnotations.find((fa: any) => fa.sender === 'operator')
          : fileAnnotations?.sender === 'operator'
            ? fileAnnotations
            : null;
        return !!operatorInfo;
      } catch (e) {
        return false;
      }
    }
    return false;
  });

  const [isChatFlowAvailableToStream, setIsChatFlowAvailableToStream] = createSignal(false);
  const [chatId, setChatId] = createSignal('');
  const [isMessageStopping, setIsMessageStopping] = createSignal(false);

  let autofaqPollingInterval: NodeJS.Timeout | null = null;
  let autofaqLastMessageId: string | undefined = undefined;
  let isPollingActive = false;
  const [starterPrompts, setStarterPrompts] = createSignal<string[]>([], { equals: false });
  const [chatFeedbackStatus, setChatFeedbackStatus] = createSignal<boolean>(true); // По умолчанию фидбэк включен
  const [fullFileUpload, setFullFileUpload] = createSignal<boolean>(false);
  const [uploadsConfig, setUploadsConfig] = createSignal<UploadsConfig>();
  const [leadsConfig, setLeadsConfig] = createSignal<LeadsConfig>();
  const [isLeadSaved, setIsLeadSaved] = createSignal(false);
  const [leadEmail, setLeadEmail] = createSignal('');
  const [disclaimerPopupOpen, setDisclaimerPopupOpen] = createSignal(false);
  const [hasServiceError, setHasServiceError] = createSignal(false);

  const [openFeedbackDialog, setOpenFeedbackDialog] = createSignal(false);
  const [feedback, setFeedback] = createSignal('');
  const [pendingActionData, setPendingActionData] = createSignal(null);
  const [feedbackType, setFeedbackType] = createSignal('');
  const [isTransferring, setIsTransferring] = createSignal(false);

  // AbortController для текущего SSE-запроса (streaming)
  let sseAbortController: AbortController | null = null;

  // start input type
  const [startInputType, setStartInputType] = createSignal('');
  const [formTitle, setFormTitle] = createSignal('');
  const [formDescription, setFormDescription] = createSignal('');
  const [formInputParams, setFormInputParams] = createSignal([]);

  // Данные пользователя (ФИО и другие данные)
  const [userData, setUserData] = createSignal<{ fio?: string; user_id?: string; user_name?: string; email?: string; token?: string }>({});

  // drag & drop file input
  // TODO: fix this type
  const [previews, setPreviews] = createSignal<FilePreview[]>([]);

  // follow-up prompts
  const [followUpPromptsStatus, setFollowUpPromptsStatus] = createSignal<boolean>(false);
  const [followUpPrompts, setFollowUpPrompts] = createSignal<string[]>([]);

  // drag & drop
  const [isDragActive, setIsDragActive] = createSignal(false);
  const [uploadedFiles, setUploadedFiles] = createSignal<{ file: File; type: string }[]>([]);
  const [fullFileUploadAllowedTypes, setFullFileUploadAllowedTypes] = createSignal('*');

  createMemo(() => {
    const customerId = (props.chatflowConfig?.vars as any)?.customerId;
    setChatId(customerId ? `${customerId.toString()}+${uuidv4()}` : uuidv4());
  });

  // Формируем welcomeText (только текст, без приветствия)
  const formattedWelcomeText = createMemo(() => {
    return props.welcomeText ?? defaultWelcomeText;
  });

  onMount(async () => {
    // Загружаем данные пользователя при монтировании компонента
    // URL для auth запроса фиксированный (https://sk.ru/auth/user_info/), не зависит от apiHost
    const data = await getUserDataWithAuth(props.onRequest);

    setUserData(data);

    if (botProps?.observersConfig) {
      const { observeUserInput, observeLoading, observeMessages } = botProps.observersConfig;
      typeof observeUserInput === 'function' &&
        // eslint-disable-next-line solid/reactivity
        createMemo(() => {
          observeUserInput(userInput());
        });
      typeof observeLoading === 'function' &&
        // eslint-disable-next-line solid/reactivity
        createMemo(() => {
          observeLoading(loading());
        });
      typeof observeMessages === 'function' &&
        // eslint-disable-next-line solid/reactivity
        createMemo(() => {
          observeMessages(messages());
        });
    }

    if (!bottomSpacer) return;
    setTimeout(() => {
      chatContainer?.scrollTo(0, chatContainer.scrollHeight);
    }, 50);
  });

  const startAutoFAQPolling = () => {
    if (isPollingActive) return;
    isPollingActive = true;

    const pollForNewMessages = async () => {
      try {
        const currentChatId = chatId();
        if (!currentChatId) return;

        const currentMessages = messages();
        // ВАЖНО: Определяем lastMessageId по дате создания, а не по порядку в массиве
        // Это гарантирует, что мы получим действительно последнее сообщение
        const lastMessageWithId = [...currentMessages]
          .filter((msg) => (msg.messageId || msg.id) && !String(msg.messageId || msg.id).startsWith('transfer-'))
          .sort((a, b) => {
            // Сортируем по дате создания, если она есть
            const aDate = a.dateTime ? new Date(a.dateTime).getTime() : 0;
            const bDate = b.dateTime ? new Date(b.dateTime).getTime() : 0;
            if (aDate !== bDate) return bDate - aDate; // Более новые сообщения первыми
            // Если даты равны или отсутствуют, используем порядок в массиве
            return 0;
          })[0];
        const newLastMessageId = lastMessageWithId?.messageId || lastMessageWithId?.id;

        if (newLastMessageId && newLastMessageId !== autofaqLastMessageId) {
          autofaqLastMessageId = newLastMessageId;
        }

        const result = await getChatMessagesQuery({
          chatflowid: props.chatflowid,
          apiHost: props.apiHost,
          chatId: currentChatId,
          lastMessageId: autofaqLastMessageId || undefined,
          onRequest: props.onRequest,
        });

        if (result.error) return;

        let messagesData = result.data;
        if (messagesData && !Array.isArray(messagesData) && typeof messagesData === 'object') {
          if ('data' in messagesData && Array.isArray(messagesData.data)) {
            messagesData = messagesData.data;
          } else if ('messages' in messagesData && Array.isArray(messagesData.messages)) {
            messagesData = messagesData.messages;
          } else {
            messagesData = [messagesData];
          }
        }

        if (messagesData && Array.isArray(messagesData) && messagesData.length > 0) {
          const currentMessageIds = new Set(
            messages()
              .map((m) => m.messageId || m.id)
              .filter(Boolean),
          );

          const parseJsonField = (field: any) => {
            if (field && typeof field === 'string') {
              try {
                return JSON.parse(field);
              } catch {
                return field;
              }
            }
            return field;
          };

          const newMessages = messagesData
            .filter((msg: any) => {
              const msgId = msg.id || msg.messageId;
              return msgId && !currentMessageIds.has(msgId);
            })
            .map((message: any) => ({
              message: message.content || message.message || '',
              type: (message.role || 'apiMessage') as 'apiMessage' | 'userMessage',
              messageId: message.id,
              id: message.id,
              dateTime: message.createdDate || new Date().toISOString(),
              sourceDocuments: parseJsonField(message.sourceDocuments),
              usedTools: message.usedTools,
              fileAnnotations: parseJsonField(message.fileAnnotations),
              agentReasoning: message.agentReasoning,
              action: parseJsonField(message.action),
              artifacts: message.artifacts,
              feedback: message.feedback,
            }));

          if (newMessages.length > 0) {
            const closingMessage = newMessages.find((msg) => {
              const messageText = (msg.message || '').toLowerCase().trim();
              return (
                messageText.includes('спасибо, что воспользовались нашим сервисом') ||
                messageText.includes('спасибо что воспользовались нашим сервисом') ||
                messageText.includes('благодарим за обращение') ||
                messageText.includes('чат завершен') ||
                messageText.includes('чат закрыт')
              );
            });

            if (closingMessage) {
              stopAutoFAQPolling();
            }

            setMessages((prevMessages) => {
              const allMessages = [...prevMessages, ...newMessages];
              // ВАЖНО: Сортируем все сообщения по дате создания для правильного порядка
              const sortedMessages = allMessages.sort((a, b) => {
                const aDate = a.dateTime ? new Date(a.dateTime).getTime() : 0;
                const bDate = b.dateTime ? new Date(b.dateTime).getTime() : 0;
                if (aDate !== bDate) return aDate - bDate; // Сортируем по возрастанию даты
                return 0; // Если даты равны, сохраняем порядок
              });
              addChatMessage(sortedMessages);
              // Обновляем lastMessageId на последнее сообщение по дате
              const lastMessageByDate = sortedMessages
                .filter((msg) => (msg.messageId || msg.id) && !String(msg.messageId || msg.id).startsWith('transfer-'))
                .sort((a, b) => {
                  const aDate = a.dateTime ? new Date(a.dateTime).getTime() : 0;
                  const bDate = b.dateTime ? new Date(b.dateTime).getTime() : 0;
                  return bDate - aDate; // Более новые первыми
                })[0];
              if (lastMessageByDate && (lastMessageByDate.messageId || lastMessageByDate.id)) {
                autofaqLastMessageId = lastMessageByDate.messageId || lastMessageByDate.id;
              }
              return sortedMessages;
            });

            scrollToBottom();
          }
        }
      } catch (error) {
        // Игнорируем ошибки
      }
    };

    autofaqPollingInterval = setInterval(pollForNewMessages, 2000);
    pollForNewMessages();
  };

  const stopAutoFAQPolling = () => {
    if (autofaqPollingInterval) {
      clearInterval(autofaqPollingInterval);
      autofaqPollingInterval = null;
      isPollingActive = false;
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      chatContainer?.scrollTo(0, chatContainer.scrollHeight);
    }, 50);
  };

  /**
   * Add each chat message into localStorage
   */
  const addChatMessage = (allMessage: MessageType[]) => {
    const messages = allMessage.map((item) => {
      if (item.fileUploads) {
        const fileUploads = item?.fileUploads.map((file) => ({
          type: file.type,
          name: file.name,
          mime: file.mime,
        }));
        return { ...item, fileUploads };
      }
      return item;
    });
    setLocalStorageChatflow(props.chatflowid, chatId(), { chatHistory: messages });
  };

  const updateLastMessage = (text: string) => {
    setMessages((prevMessages) => {
      const allMessages = [...cloneDeep(prevMessages)];
      if (allMessages[allMessages.length - 1].type === 'userMessage') return allMessages;
      if (!text) return allMessages;
      allMessages[allMessages.length - 1].message += text;
      allMessages[allMessages.length - 1].rating = undefined;
      if (!allMessages[allMessages.length - 1].dateTime) {
        allMessages[allMessages.length - 1].dateTime = new Date().toISOString();
      }
      addChatMessage(allMessages);
      return allMessages;
    });
  };

  const updateErrorMessage = (errorMessage: string) => {
    // Логируем полную информацию об ошибке в консоль
    console.error('Service Error (EventStream):', {
      message: errorMessage,
      timestamp: new Date().toISOString(),
    });

    // Устанавливаем состояние ошибки сервиса (пользователю всегда показываем один экран)
    setHasServiceError(true);

    // Не добавляем сообщение в чат, так как показывается ServiceErrorScreen
  };

  const updateLastMessageSourceDocuments = (sourceDocuments: any) => {
    setMessages((data) => {
      const updated = data.map((item, i) => {
        if (i === data.length - 1) {
          return { ...item, sourceDocuments };
        }
        return item;
      });
      addChatMessage(updated);
      return [...updated];
    });
  };

  const updateLastMessageUsedTools = (usedTools: any[]) => {
    setMessages((prevMessages) => {
      const allMessages = [...cloneDeep(prevMessages)];
      if (allMessages[allMessages.length - 1].type === 'userMessage') return allMessages;
      allMessages[allMessages.length - 1].usedTools = usedTools;
      addChatMessage(allMessages);
      return allMessages;
    });
  };

  const updateLastMessageFileAnnotations = (fileAnnotations: any) => {
    setMessages((prevMessages) => {
      const allMessages = [...cloneDeep(prevMessages)];
      if (allMessages[allMessages.length - 1].type === 'userMessage') return allMessages;
      allMessages[allMessages.length - 1].fileAnnotations = fileAnnotations;
      addChatMessage(allMessages);
      return allMessages;
    });
  };

  const updateLastMessageAgentReasoning = (agentReasoning: string | IAgentReasoning[]) => {
    setMessages((data) => {
      const updated = data.map((item, i) => {
        if (i === data.length - 1) {
          return { ...item, agentReasoning: typeof agentReasoning === 'string' ? JSON.parse(agentReasoning) : agentReasoning };
        }
        return item;
      });
      addChatMessage(updated);
      return [...updated];
    });
  };

  const updateAgentFlowEvent = (event: string) => {
    if (event === 'INPROGRESS') {
      setMessages((prevMessages) => [
        ...prevMessages,
        { message: '', type: 'apiMessage', agentFlowEventStatus: event, dateTime: new Date().toISOString() },
      ]);
    } else {
      setMessages((prevMessages) => {
        const allMessages = [...cloneDeep(prevMessages)];
        if (allMessages[allMessages.length - 1].type === 'userMessage') return allMessages;
        allMessages[allMessages.length - 1].agentFlowEventStatus = event;
        return allMessages;
      });
    }
  };

  const updateAgentFlowExecutedData = (agentFlowExecutedData: any) => {
    setMessages((prevMessages) => {
      const allMessages = [...cloneDeep(prevMessages)];
      if (allMessages[allMessages.length - 1].type === 'userMessage') return allMessages;
      allMessages[allMessages.length - 1].agentFlowExecutedData = agentFlowExecutedData;
      addChatMessage(allMessages);
      return allMessages;
    });
  };

  const updateLastMessageArtifacts = (artifacts: FileUpload[]) => {
    setMessages((prevMessages) => {
      const allMessages = [...cloneDeep(prevMessages)];
      if (allMessages[allMessages.length - 1].type === 'userMessage') return allMessages;
      allMessages[allMessages.length - 1].artifacts = artifacts;
      addChatMessage(allMessages);
      return allMessages;
    });
  };

  const updateLastMessageAction = (action: IAction) => {
    setMessages((data) => {
      const updated = data.map((item, i) => {
        if (i === data.length - 1) {
          let normalizedAction = typeof action === 'string' ? JSON.parse(action) : action;

          // Нормализация формата кнопок от AutoFAQ
          // AutoFAQ может отправлять кнопки в формате { type: "buttons", buttons: [...] }
          // Преобразуем в формат { elements: [...] }
          if (normalizedAction && normalizedAction.type === 'buttons' && Array.isArray(normalizedAction.buttons)) {
            normalizedAction = {
              ...normalizedAction,
              elements: normalizedAction.buttons.map((btn: any) => ({
                type: btn.type || 'button',
                label: btn.text || btn.label || btn.value || 'Кнопка',
                value: btn.value,
              })),
            };
            // Удаляем старый формат buttons, оставляем только elements
            delete normalizedAction.buttons;
          }

          return { ...item, action: normalizedAction };
        }
        return item;
      });
      addChatMessage(updated);
      return [...updated];
    });
  };

  const clearPreviews = () => {
    // Revoke the data uris to avoid memory leaks
    previews().forEach((file) => URL.revokeObjectURL(file.preview));
    setPreviews([]);
  };

  // Handle errors
  const handleError = (message = 'Oops! There seems to be an error. Please try again.', preventOverride?: boolean, errorDetails?: any) => {
    // Логируем полную информацию об ошибке в консоль
    console.error('Service Error:', {
      message,
      errorDetails,
      timestamp: new Date().toISOString(),
    });

    // Устанавливаем состояние ошибки сервиса (пользователю всегда показываем один экран)
    setHasServiceError(true);

    // Не добавляем сообщение в чат, так как показывается ServiceErrorScreen
    setLoading(false);
    setUserInput('');
    setUploadedFiles([]);
  };

  const handleDisclaimerAccept = () => {
    setDisclaimerPopupOpen(false); // Close the disclaimer popup
    setCookie('chatbotDisclaimer', 'true', 365); // Disclaimer accepted
  };

  const promptClick = (prompt: string) => {
    handleSubmit(prompt);
  };

  const followUpPromptClick = (prompt: string) => {
    setFollowUpPrompts([]);
    handleSubmit(prompt);
  };

  const updateMetadata = (data: any, input: string) => {
    if (data.chatId) {
      setChatId(data.chatId);
    }

    // set message id that is needed for feedback
    if (data.chatMessageId) {
      setMessages((prevMessages) => {
        const allMessages = [...cloneDeep(prevMessages)];
        if (allMessages[allMessages.length - 1].type === 'apiMessage') {
          allMessages[allMessages.length - 1].messageId = data.chatMessageId;
          // Use dateTime from server if available
          if (data.dateTime) {
            allMessages[allMessages.length - 1].dateTime = data.dateTime;
          }
        }
        addChatMessage(allMessages);
        return allMessages;
      });
    }

    if (input === '' && data.question) {
      // so if input is empty but the response contains the question, update the user message to show the question
      setMessages((prevMessages) => {
        const allMessages = [...cloneDeep(prevMessages)];
        if (allMessages[allMessages.length - 2].type === 'apiMessage') return allMessages;
        allMessages[allMessages.length - 2].message = data.question;
        // Use dateTime from server if available for user message
        if (data.userMessageDateTime) {
          allMessages[allMessages.length - 2].dateTime = data.userMessageDateTime;
        }
        addChatMessage(allMessages);
        return allMessages;
      });
    }

    if (data.followUpPrompts) {
      setMessages((prevMessages) => {
        const allMessages = [...cloneDeep(prevMessages)];
        if (allMessages[allMessages.length - 1].type === 'userMessage') return allMessages;
        allMessages[allMessages.length - 1].followUpPrompts = data.followUpPrompts;
        addChatMessage(allMessages);
        return allMessages;
      });
      setFollowUpPrompts(JSON.parse(data.followUpPrompts));
    }
  };

  const fetchResponseFromEventStream = async (chatflowid: string, params: any) => {
    const chatId = params.chatId;
    const input = params.question;
    params.streaming = true;

    // Подготавливаем headers и применяем onRequest если есть
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (props.onRequest) {
      const requestInit: RequestInit = {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
      };
      await props.onRequest(requestInit);
      // Копируем обновленные headers обратно
      if (requestInit.headers) {
        Object.assign(headers, requestInit.headers as Record<string, string>);
      }
    }

    // ВАЖНО: EventSource (SSE) имеет ограничения по CORS:
    // 1. Не поддерживает кастомные заголовки (кроме Content-Type)
    // 2. Не поддерживает credentials так же хорошо, как fetch
    // 3. Браузер может блокировать запрос до установки CORS заголовков сервером
    // Поэтому используем только минимальные заголовки для SSE
    const sseHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Перед каждым новым SSE-запросом отменяем предыдущий, если он ещё активен
    if (sseAbortController) {
      sseAbortController.abort();
      sseAbortController = null;
    }
    sseAbortController = new AbortController();

    // ВАЖНО: fetchEventSource использует fetch API, который требует правильной настройки CORS
    // Используем 'same-origin' для credentials, чтобы избежать проблем с CORS
    fetchEventSource(`${props.apiHost}/api/v1/prediction/${chatflowid}`, {
      openWhenHidden: true,
      method: 'POST',
      body: JSON.stringify(params),
      headers: sseHeaders,
      credentials: 'include', // Используем include для cross-origin запросов
      signal: sseAbortController.signal,
      // ВАЖНО: При credentials: 'include' сервер должен устанавливать Access-Control-Allow-Credentials: true
      // и Access-Control-Allow-Origin должен быть конкретным origin (не '*')
      async onopen(response) {
        // Проверяем, является ли ответ SSE потоком
        const contentType = response.headers.get('content-type') || '';
        const isEventStream = contentType.startsWith(EventStreamContentType);

        if (response.ok && isEventStream) return; // everything's good - это SSE поток

        // Если ответ не SSE, проверяем, не является ли это JSON ответом с autofaqMode
        // ВАЖНО: response.text() можно вызвать только один раз, поэтому клонируем response
        if (response.ok && (contentType.includes('application/json') || contentType.includes('text/json'))) {
          try {
            // Клонируем response, чтобы можно было прочитать его несколько раз
            const clonedResponse = response.clone();
            const responseText = await clonedResponse.text();

            const jsonData = JSON.parse(responseText);

            // Если это ответ от AutoFAQ режима, обрабатываем его специально
            if (jsonData.autofaqMode) {

              setLoading(false);
              setUserInput('');
              setUploadedFiles([]);

              // Закрываем SSE соединение, т.к. это не SSE поток
              closeResponse();

              // Не бросаем ошибку, просто завершаем обработку
              // Используем AbortController для корректного закрытия
              throw new Error('AutoFAQ mode - closing SSE connection');
            }
          } catch (parseError: any) {
            // Если это наша ошибка для закрытия соединения, просто пробрасываем её
            if (parseError.message === 'AutoFAQ mode - closing SSE connection') {
              throw parseError;
            }
            // Если не удалось распарсить JSON, продолжаем обычную обработку ошибки
            console.error('[Bot] Ошибка парсинга JSON ответа:', parseError);
          }
        }

        // Обработка ошибок
        if (response.status === 429) {
          const clonedResponse = response.clone();
          const errMessage = (await clonedResponse.text()) ?? 'Too many requests. Please try again later.';
          handleError(errMessage, true, { status: 429, response });
          throw new Error(errMessage);
        } else if (response.status === 403) {
          const clonedResponse = response.clone();
          const errMessage = (await clonedResponse.text()) ?? 'Unauthorized';
          handleError(errMessage, false, { status: 403, response });
          throw new Error(errMessage);
        } else if (response.status === 401) {
          const clonedResponse = response.clone();
          const errMessage = (await clonedResponse.text()) ?? 'Unauthenticated';
          handleError(errMessage, false, { status: 401, response });
          throw new Error(errMessage);
        } else {
          // Для других статусов пытаемся прочитать текст ответа
          try {
            const clonedResponse = response.clone();
            const errMessage = await clonedResponse.text();
            console.error('[Bot] ❌ Ошибка SSE запроса:', {
              status: response.status,
              statusText: response.statusText,
              message: errMessage.substring(0, 200),
            });
            handleError(errMessage, false, { status: response.status, statusText: response.statusText, response });
            throw new Error(errMessage);
          } catch (textError) {
            const errMessage = `HTTP ${response.status}: ${response.statusText}`;
          handleError(errMessage, false, { status: response.status, statusText: response.statusText, response });
          throw new Error(errMessage);
          }
        }
      },
      async onmessage(ev) {
        const payload = JSON.parse(ev.data);
        switch (payload.event) {
          case 'start':
            // Сообщение уже создано при начале загрузки, просто обновляем его если нужно
            break;
          case 'token':
            updateLastMessage(payload.data);
            break;
          case 'sourceDocuments':
            updateLastMessageSourceDocuments(payload.data);
            break;
          case 'usedTools':
            updateLastMessageUsedTools(payload.data);
            break;
          case 'fileAnnotations':
            updateLastMessageFileAnnotations(payload.data);
            break;
          case 'agentReasoning':
            updateLastMessageAgentReasoning(payload.data);
            break;
          case 'agentFlowEvent':
            updateAgentFlowEvent(payload.data);
            break;
          case 'agentFlowExecutedData':
            updateAgentFlowExecutedData(payload.data);
            break;
          case 'action':
            updateLastMessageAction(payload.data);
            break;
          case 'artifacts':
            updateLastMessageArtifacts(payload.data);
            break;
          case 'metadata':
            updateMetadata(payload.data, input);
            break;
          case 'error':
            updateErrorMessage(payload.data);
            break;
          case 'abort':
            abortMessage();
            closeResponse();
            break;
          case 'end':
            setLocalStorageChatflow(chatflowid, chatId);
            closeResponse();
            break;
        }
      },
      async onclose() {
        closeResponse();
      },
      onerror(err) {
        // Логируем полную информацию об ошибке в консоль
        console.error('[Bot] ❌ EventSource Error:', {
          error: err,
          errorType: err?.constructor?.name,
          errorMessage: err?.message,
          errorStack: err?.stack,
          url: `${props.apiHost}/api/v1/prediction/${chatflowid}`,
          timestamp: new Date().toISOString(),
        });

        // Если запрос был прерван явно (AbortController), не считаем это ошибкой сервиса
        if (err?.name === 'AbortError') {
          closeResponse();
          return;
        }

        // Если это наша ошибка для закрытия соединения при AutoFAQ режиме, не показываем ошибку
        if (err?.message === 'AutoFAQ mode - closing SSE connection') {
          closeResponse();
          return; // Не бросаем ошибку дальше
        }

        // Если это CORS ошибка, показываем более понятное сообщение
        if (err?.message?.includes('CORS') || err?.message?.includes('fetch')) {
          console.error('[Bot] ❌ CORS ошибка при SSE запросе. Попробуйте использовать обычный запрос вместо SSE.');
          handleError('Ошибка подключения к серверу. Проверьте настройки CORS на сервере.', false, err);
        } else {
        setHasServiceError(true);
        }
        closeResponse();
        throw err;
      },
    });
  };

  const closeResponse = () => {
    setLoading(false);
    setUserInput('');
    setUploadedFiles([]);
    setTimeout(() => {
      scrollToBottom();
    }, 100);
  };

  const abortMessage = () => {
    setIsMessageStopping(false);
    setMessages((prevMessages) => {
      const allMessages = [...cloneDeep(prevMessages)];
      if (allMessages[allMessages.length - 1].type === 'userMessage') return allMessages;
      const lastAgentReasoning = allMessages[allMessages.length - 1].agentReasoning;
      if (lastAgentReasoning && lastAgentReasoning.length > 0) {
        allMessages[allMessages.length - 1].agentReasoning = lastAgentReasoning.filter((reasoning) => !reasoning.nextAgent);
      }
      return allMessages;
    });
  };

  const handleFileUploads = async (uploads: IUploads) => {
    if (!uploadedFiles().length) return uploads;

    if (fullFileUpload()) {
      const filesWithFullUploadType = uploadedFiles().filter((file) => file.type === 'file:full');

      if (filesWithFullUploadType.length > 0) {
        const formData = new FormData();
        for (const file of filesWithFullUploadType) {
          formData.append('files', file.file);
        }
        formData.append('chatId', chatId());

        const response = await createAttachmentWithFormData({
          chatflowid: props.chatflowid,
          apiHost: props.apiHost,
          formData: formData,
        });

        if (!response.data) {
          throw new Error('Unable to upload documents');
        } else {
          const data = response.data as any;
          for (const extractedFileData of data) {
            const content = extractedFileData.content;
            const fileName = extractedFileData.name;

            // find matching name in previews and replace data with content
            const uploadIndex = uploads.findIndex((upload) => upload.name === fileName);
            if (uploadIndex !== -1) {
              uploads[uploadIndex] = {
                ...uploads[uploadIndex],
                data: content,
                name: fileName,
                type: 'file:full',
              };
            }
          }
        }
      }
    } else if (uploadsConfig()?.isRAGFileUploadAllowed) {
      const filesWithRAGUploadType = uploadedFiles().filter((file) => file.type === 'file:rag');

      if (filesWithRAGUploadType.length > 0) {
        const formData = new FormData();
        for (const file of filesWithRAGUploadType) {
          formData.append('files', file.file);
        }
        formData.append('chatId', chatId());

        const response = await upsertVectorStoreWithFormData({
          chatflowid: props.chatflowid,
          apiHost: props.apiHost,
          formData: formData,
        });

        if (!response.data) {
          throw new Error('Unable to upload documents');
        } else {
          // delay for vector store to be updated
          const delay = (delayInms: number) => {
            return new Promise((resolve) => setTimeout(resolve, delayInms));
          };
          await delay(2500); //TODO: check if embeddings can be retrieved using file name as metadata filter

          uploads = uploads.map((upload) => {
            return {
              ...upload,
              type: 'file:rag',
            };
          });
        }
      }
    }
    return uploads;
  };

  // Handle form submission
  const handleSubmit = async (value: string | object, action?: IAction | undefined | null, humanInput?: any) => {
    if (typeof value === 'string' && value.trim() === '') {
      const containsFile = previews().filter((item) => !item.mime.startsWith('image')).length > 0;
      if (!previews().length || (previews().length && containsFile)) {
        return;
      }
    }

    let formData = {};
    if (typeof value === 'object') {
      formData = value;
      value = Object.entries(value)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
    }

    setLoading(true);
    scrollToBottom();

    let uploads: IUploads = previews().map((item) => {
      return {
        data: item.data,
        type: item.type,
        name: item.name,
        mime: item.mime,
      };
    });

    try {
      uploads = await handleFileUploads(uploads);
    } catch (error) {
      handleError('Unable to upload documents', true, { error, uploads });
      return;
    }

    clearPreviews();

    setMessages((prevMessages) => {
      const messages: MessageType[] = [
        ...prevMessages,
        { message: value as string, type: 'userMessage', fileUploads: uploads, dateTime: new Date().toISOString() },
      ];
      addChatMessage(messages);
      return messages;
    });

    const currentChatId = chatId();
    const body: IncomingInput = {
      question: value,
      chatId: currentChatId,
    };

    if (startInputType() === 'formInput') {
      body.form = formData;
      delete body.question;
    }

    if (uploads && uploads.length > 0) body.uploads = uploads;

    // Используем данные пользователя, которые уже загружены в onMount
    // Если данные еще не загрузились, используем то, что есть (или значения по умолчанию)
    const currentUserData = userData();

    // Формируем userData для отправки в AI платформу
    // Передаем user_id (id из ответа auth или guest_id для гостя), fio и email
    const userDataForRequest: Record<string, unknown> = {};
    // Передаем user_id только если он есть (для авторизованных) или guest_id (для гостей)
    if (currentUserData.user_id) {
      userDataForRequest.user_id = currentUserData.user_id;
    }
    // Передаем fio (ФИО) если оно есть
    if (currentUserData.fio) {
      userDataForRequest.fio = currentUserData.fio;
    }
    // Передаем email если он есть
    if (currentUserData.email) {
      userDataForRequest.email = currentUserData.email;
    }
    // Передаем login если он есть (тестовые данные)
    if ((currentUserData as any).login) {
      userDataForRequest.login = (currentUserData as any).login;
    }
    // Передаем shortname если он есть (тестовые данные)
    if ((currentUserData as any).shortname) {
      userDataForRequest.shortname = (currentUserData as any).shortname;
    }
    // Передаем orn если он есть (тестовые данные)
    if ((currentUserData as any).orn) {
      userDataForRequest.orn = (currentUserData as any).orn;
    }

    // Если есть хотя бы одно поле, добавляем userData в overrideConfig
    if (Object.keys(userDataForRequest).length > 0) {
      body.overrideConfig = {
        ...(props.chatflowConfig || {}),
        userData: userDataForRequest,
      };
    } else if (props.chatflowConfig) {
      body.overrideConfig = props.chatflowConfig;
    }

    if (leadEmail()) body.leadEmail = leadEmail();

    if (action) body.action = action;

    if (humanInput) body.humanInput = humanInput;

    const hasTransferMessage = messages().some(
      (msg) => msg.message && typeof msg.message === 'string' &&
        msg.message.includes('Чат передан оператору')
    );

    const isTransferredToOperator = hasTransferMessage || isPollingActive;


    if (isTransferredToOperator) {
      // ВАЖНО: Создаем пустое сообщение для показа loading bubble перед отправкой запроса
      // Это нужно для случая, когда чат возвращается из AutoFAQ в LLM режим
      // Убеждаемся, что loading установлен в true, чтобы показать TypingBubble
      setLoading(true);

      setMessages((prevMessages) => {
        const allMessages = [...cloneDeep(prevMessages)];
        // Проверяем, есть ли уже пустое apiMessage (loading bubble)
        const lastMessage = allMessages[allMessages.length - 1];
        if (!lastMessage || lastMessage.type !== 'apiMessage' || lastMessage.message !== '') {
          // Если последнее сообщение не является пустым apiMessage, создаем его
          allMessages.push({ message: '', type: 'apiMessage', dateTime: new Date().toISOString() });
        }
        return allMessages;
      });

      try {
        const result = await sendMessageQuery({
          chatflowid: props.chatflowid,
          apiHost: props.apiHost,
          body,
          onRequest: props.onRequest,
        });

        if (result.data) {
          const data = result.data;
          if (data.autofaqMode) {
            // Если ответ указывает на AutoFAQ режим, удаляем пустое сообщение и переключаемся в AutoFAQ
            setMessages((prevMessages) => {
              const allMessages = [...cloneDeep(prevMessages)];
              // Удаляем последнее пустое сообщение, если оно есть
              if (allMessages[allMessages.length - 1]?.type === 'apiMessage' && allMessages[allMessages.length - 1]?.message === '') {
                allMessages.pop();
              }
              return allMessages;
            });
            setLoading(false);
            setUserInput('');
            setUploadedFiles([]);
            if (!isPollingActive) {
              startAutoFAQPolling();
            }
            return;
          }
          // Обрабатываем обычный ответ (LLM режим)
          // ВАЖНО: Если получили обычный ответ (не autofaqMode), значит чат вернулся в LLM режим
          // Останавливаем polling AutoFAQ, если он был активен
          if (isPollingActive) {
            stopAutoFAQPolling();
          }

          let text = '';
          if (data.text) text = data.text;
          else if (data.json) text = JSON.stringify(data.json, null, 2);
          else text = JSON.stringify(data, null, 2);

          if (data?.chatId) setChatId(data.chatId);

          setMessages((prevMessages) => {
            const allMessages = [...cloneDeep(prevMessages)];
            const lastMessage = allMessages[allMessages.length - 1];
            // Обновляем пустое сообщение (loading bubble) содержимым ответа
            if (lastMessage && lastMessage.type === 'apiMessage' && lastMessage.message === '') {
              lastMessage.message = text;
              lastMessage.id = data?.chatMessageId;
              lastMessage.sourceDocuments = data?.sourceDocuments;
              lastMessage.usedTools = data?.usedTools;
              lastMessage.fileAnnotations = data?.fileAnnotations;
              lastMessage.agentReasoning = data?.agentReasoning;
              lastMessage.agentFlowExecutedData = data?.agentFlowExecutedData;
              lastMessage.action = data?.action;
              lastMessage.artifacts = data?.artifacts;
              lastMessage.dateTime = data?.dateTime ?? new Date().toISOString();
            } else {
              // Если пустого сообщения нет, создаем новое
              const newMessage = {
                message: text,
                id: data?.chatMessageId,
                sourceDocuments: data?.sourceDocuments,
                usedTools: data?.usedTools,
                fileAnnotations: data?.fileAnnotations,
                agentReasoning: data?.agentReasoning,
                agentFlowExecutedData: data?.agentFlowExecutedData,
                action: data?.action,
                artifacts: data?.artifacts,
                type: 'apiMessage' as messageType,
                dateTime: data?.dateTime ?? new Date().toISOString(),
              };
              allMessages.push(newMessage);
            }
            addChatMessage(allMessages);
            return allMessages;
          });

          updateMetadata(data, value);
          setLoading(false);
          setUserInput('');
          setUploadedFiles([]);
          scrollToBottom();
        }
        if (result.error) {
          const error = result.error;
          if (typeof error === 'object') {
            handleError(`Error: ${error?.message.replaceAll('Error:', ' ')}`, false, error);
            return;
          }
          if (typeof error === 'string') {
            handleError(error, false, { errorString: error });
            return;
          }
          handleError('Unknown error occurred', false, { error });
          return;
        }
      } catch (error) {
        console.error('[Bot] ❌ Ошибка при отправке сообщения в AutoFAQ:', error);
        // Если это ошибка от AutoFAQ режима, не показываем её как ошибку
        if ((error as any)?.response?.data?.autofaqMode) {
          setLoading(false);
          setUserInput('');
          setUploadedFiles([]);
          return;
        }
        // Для других ошибок показываем сообщение об ошибке
        if ((error as any)?.response?.data?.message) {
          handleError((error as any).response.data.message, false, error);
        } else {
          handleError((error as any)?.message || 'Произошла ошибка при отправке сообщения в AutoFAQ', false, error);
        }
        return;
      }
    } else if (isChatFlowAvailableToStream() && !isTransferredToOperator) {
      // Создаем пустое сообщение сразу, чтобы показать индикатор загрузки
      setMessages((prevMessages) => [...prevMessages, { message: '', type: 'apiMessage', dateTime: new Date().toISOString() }]);
      fetchResponseFromEventStream(props.chatflowid, body);
    } else {
      // Создаем пустое сообщение сразу для не-streaming запросов, чтобы показать индикатор загрузки
      setMessages((prevMessages) => [...prevMessages, { message: '', type: 'apiMessage', dateTime: new Date().toISOString() }]);

      const result = await sendMessageQuery({
        chatflowid: props.chatflowid,
        apiHost: props.apiHost,
        body,
        onRequest: props.onRequest,
      });

      if (result.data) {
        const data = result.data;

        let text = '';
        if (data.text) text = data.text;
        else if (data.json) text = JSON.stringify(data.json, null, 2);
        else text = JSON.stringify(data, null, 2);

        if (data?.chatId) setChatId(data.chatId);

        setMessages((prevMessages) => {
          const allMessages = [...cloneDeep(prevMessages)];
          // Обновляем последнее пустое сообщение вместо создания нового
          const lastMessage = allMessages[allMessages.length - 1];
          if (lastMessage && lastMessage.type === 'apiMessage' && lastMessage.message === '') {
            lastMessage.message = text;
            lastMessage.id = data?.chatMessageId;
            lastMessage.sourceDocuments = data?.sourceDocuments;
            lastMessage.usedTools = data?.usedTools;
            lastMessage.fileAnnotations = data?.fileAnnotations;
            lastMessage.agentReasoning = data?.agentReasoning;
            lastMessage.agentFlowExecutedData = data?.agentFlowExecutedData;
            lastMessage.action = data?.action;
            lastMessage.artifacts = data?.artifacts;
            lastMessage.dateTime = data?.dateTime ?? new Date().toISOString();
          } else {
            const newMessage = {
              message: text,
              id: data?.chatMessageId,
              sourceDocuments: data?.sourceDocuments,
              usedTools: data?.usedTools,
              fileAnnotations: data?.fileAnnotations,
              agentReasoning: data?.agentReasoning,
              agentFlowExecutedData: data?.agentFlowExecutedData,
              action: data?.action,
              artifacts: data?.artifacts,
              type: 'apiMessage' as messageType,
              dateTime: data?.dateTime ?? new Date().toISOString(),
            };
            allMessages.push(newMessage);
          }
          addChatMessage(allMessages);
          return allMessages;
        });

        updateMetadata(data, value);

        setLoading(false);
        setUserInput('');
        setUploadedFiles([]);
        scrollToBottom();
      }
      if (result.error) {
        const error = result.error;
        if (typeof error === 'object') {
          handleError(`Error: ${error?.message.replaceAll('Error:', ' ')}`, false, error);
          return;
        }
        if (typeof error === 'string') {
          handleError(error, false, { errorString: error });
          return;
        }
        handleError('Unknown error occurred', false, { error });
        return;
      }
    }

    // Update last question to avoid saving base64 data to localStorage
    if (uploads && uploads.length > 0) {
      setMessages((data) => {
        const messages = data.map((item, i) => {
          if (i === data.length - 2 && item.type === 'userMessage') {
            if (item.fileUploads) {
              const fileUploads = item?.fileUploads.map((file) => ({
                type: file.type,
                name: file.name,
                mime: file.mime,
              }));
              return { ...item, fileUploads };
            }
          }
          return item;
        });
        addChatMessage(messages);
        return [...messages];
      });
    }
  };

  const onSubmitResponse = (actionData: any, feedback = '', type = '') => {
    let fbType = feedbackType();
    if (type) {
      fbType = type;
    }
    const question = feedback ? feedback : fbType.charAt(0).toUpperCase() + fbType.slice(1);
    handleSubmit(question, undefined, {
      type: fbType,
      startNodeId: actionData?.nodeId,
      feedback,
    });
  };

  const handleSubmitFeedback = () => {
    if (pendingActionData()) {
      onSubmitResponse(pendingActionData(), feedback());
      setOpenFeedbackDialog(false);
      setFeedback('');
      setPendingActionData(null);
      setFeedbackType('');
    }
  };


  const handleActionClick = async (elem: any, action: IAction | undefined | null) => {
    // Проверяем, является ли это кнопкой связи с оператором (AutoFAQ)
    const isOperatorHandoff =
      elem.type === 'operator-handoff' ||
      elem.value === 'operator_handoff' ||
      elem.type === 'operator' ||
      (elem.label && (elem.label.toLowerCase().includes('оператор') || elem.label.toLowerCase().includes('operator')));

    if (isOperatorHandoff) {
      try {
        const currentUserData = userData();

        // Формируем body с данными пользователя
        const requestBody = {
          chatId: chatId(),
          userMessage: elem.label || 'Пользователь запросил связь с оператором',
          email: currentUserData.email,
          fio: currentUserData.fio,
          overrideConfig: {
            userData: {
              email: currentUserData.email,
              fullName: currentUserData.fio || currentUserData.user_name,
              fio: currentUserData.fio || currentUserData.user_name,
              login: (currentUserData as any).login,
              userId: currentUserData.user_id,
              shortname: (currentUserData as any).shortname,
              orn: (currentUserData as any).orn,
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
          // Убираем кнопку из сообщения
          setMessages((data) => {
            const updated = data.map((item, i) => {
              if (i === data.length - 1) {
                return { ...item, action: null };
              }
              return item;
            });
            addChatMessage(updated);
            return [...updated];
          });

          const transferMessage = {
            message: 'Чат передан оператору. Ожидайте ответа...',
            type: 'apiMessage' as const,
            dateTime: new Date().toISOString(),
          };
          setMessages((prevMessages) => {
            const updated = [...prevMessages, transferMessage];
            addChatMessage(updated);
            return updated;
          });

          setTimeout(() => {
            startAutoFAQPolling();
          }, 1000);

          scrollToBottom();
          return;
        } else if (result.error) {
          console.error('❌ [Bot] Ошибка передачи истории:', result.error);
          handleError('Не удалось передать запрос оператору. Попробуйте еще раз.');
          return;
        }
      } catch (error) {
        console.error('❌ [Bot] Ошибка при передаче истории в AutoFAQ:', error);
        handleError('Не удалось передать запрос оператору. Попробуйте еще раз.');
        return;
      }
    }

    // Обычная обработка кнопок
    setUserInput(elem.label);
    setMessages((data) => {
      const updated = data.map((item, i) => {
        if (i === data.length - 1) {
          return { ...item, action: null };
        }
        return item;
      });
      addChatMessage(updated);
      return [...updated];
    });

    if (elem.type.includes('agentflowv2')) {
      const type = elem.type.includes('approve') ? 'proceed' : 'reject';
      setFeedbackType(type);

      if (action && action.data && action.data.input && action.data.input.humanInputEnableFeedback) {
        setPendingActionData(action.data);
        setOpenFeedbackDialog(true);
      } else if (action) {
        onSubmitResponse(action.data, '', type);
      }
    } else {
      handleSubmit(elem.label, action);
    }
  };

  const clearChat = () => {
    try {
      stopAutoFAQPolling();

      // Если есть активный streaming-запрос (SSE), прерываем его
      if (sseAbortController) {
        sseAbortController.abort();
        sseAbortController = null;
      }

      // Приводим состояние к такому же виду, как при завершении ответа
      setLoading(false);
      setUserInput('');
      setUploadedFiles([]);

      // Чистим cookies, связанные с текущим диалогом
      deleteCookie('guest_id');
      deleteCookie('chatbotDisclaimer');

      removeLocalStorageChatHistory(props.chatflowid);
      setChatId(
        (props.chatflowConfig?.vars as any)?.customerId ? `${(props.chatflowConfig?.vars as any).customerId.toString()}+${uuidv4()}` : uuidv4(),
      );
      setUploadedFiles([]);
      const messages: MessageType[] = [];
      if (leadsConfig()?.status && !getLocalStorageChatflow(props.chatflowid)?.lead) {
        messages.push({ message: '', type: 'leadCaptureMessage' });
      }
      setMessages(messages);
    } catch (error: any) {
      const errorData = error.response.data || `${error.response.status}: ${error.response.statusText}`;
      console.error(`error: ${errorData}`);
    }
  };

  onMount(() => {
    if (props.clearChatOnReload) {
      clearChat();
      window.addEventListener('beforeunload', clearChat);
      return () => {
        window.removeEventListener('beforeunload', clearChat);
      };
    }
  });

  createEffect(() => {
    if (props.starterPrompts) {
      let prompts: string[];

      if (Array.isArray(props.starterPrompts)) {
        // If starterPrompts is an array
        prompts = props.starterPrompts;
      } else {
        // If starterPrompts is a JSON object
        prompts = Object.values(props.starterPrompts).map((promptObj: { prompt: string }) => promptObj.prompt);
      }

      // Filter out any empty prompts
      return setStarterPrompts(prompts.filter((prompt) => prompt !== ''));
    }
  });

  // Создаем первый bubble с приветствием, если сообщений нет
  createEffect(() => {
    const currentMessages = messages();
    const currentUserData = userData();

    // Проверяем, что userData загружен и сообщений нет
    // assistantGreeting всегда есть (либо из props, либо значение по умолчанию)
    if (
      currentMessages.length === 0 &&
      Object.keys(currentUserData).length > 0 // userData загружен (не пустой объект)
    ) {
      const fio = currentUserData.fio || currentUserData.user_name;
      const assistantGreeting = props.assistantGreeting ?? defaultAssistantGreeting;

      let greeting = 'Здравствуйте';
      if (fio && fio !== 'Гость') {
        greeting = `Здравствуйте, ${fio}`;
      }

      const greetingMessage: MessageType = {
        message: `${greeting}! ${assistantGreeting}`,
        type: 'apiMessage',
        dateTime: new Date().toISOString(),
      };
      setMessages([greetingMessage]);
    }
  });

  // Auto scroll chat to bottom
  createEffect(() => {
    if (messages()) {
      if (messages().length > 1) {
        setTimeout(() => {
          chatContainer?.scrollTo(0, chatContainer.scrollHeight);
        }, 400);
      }
    }
  });

  createEffect(() => {
    if (props.fontSize && botContainer) botContainer.style.fontSize = `${props.fontSize}px`;
  });

  // eslint-disable-next-line solid/reactivity
  createEffect(async () => {
    if (props.disclaimer) {
      if (getCookie('chatbotDisclaimer') == 'true') {
        setDisclaimerPopupOpen(false);
      } else {
        setDisclaimerPopupOpen(true);
      }
    } else {
      setDisclaimerPopupOpen(false);
    }

    const chatMessage = getLocalStorageChatflow(props.chatflowid);
    if (chatMessage && Object.keys(chatMessage).length) {
      if (chatMessage.chatId) setChatId(chatMessage.chatId);
      const savedLead = chatMessage.lead;
      if (savedLead) {
        setIsLeadSaved(!!savedLead);
        setLeadEmail(savedLead.email);
      }
      const loadedMessages: MessageType[] =
        chatMessage?.chatHistory?.length > 0
          ? chatMessage.chatHistory?.map((message: MessageType) => {
              const chatHistory: MessageType = {
                messageId: message?.messageId,
                message: message.message,
                type: message.type,
                rating: message.rating,
                dateTime: message.dateTime || new Date().toISOString(), // Добавляем dateTime, если его нет
              };
              if (message.sourceDocuments) chatHistory.sourceDocuments = message.sourceDocuments;
              if (message.fileAnnotations) chatHistory.fileAnnotations = message.fileAnnotations;
              if (message.fileUploads) chatHistory.fileUploads = message.fileUploads;
              if (message.agentReasoning) chatHistory.agentReasoning = message.agentReasoning;
              if (message.action) chatHistory.action = message.action;
              if (message.artifacts) chatHistory.artifacts = message.artifacts;
              if (message.followUpPrompts) chatHistory.followUpPrompts = message.followUpPrompts;
              if (message.execution && message.execution.executionData)
                chatHistory.agentFlowExecutedData =
                  typeof message.execution.executionData === 'string' ? JSON.parse(message.execution.executionData) : message.execution.executionData;
              if (message.agentFlowExecutedData)
                chatHistory.agentFlowExecutedData =
                  typeof message.agentFlowExecutedData === 'string' ? JSON.parse(message.agentFlowExecutedData) : message.agentFlowExecutedData;
              return chatHistory;
            })
          : [];

      const filteredMessages = loadedMessages.filter((message) => message.type !== 'leadCaptureMessage');
      setMessages([...filteredMessages]);
    }

    // Determine if particular chatflow is available for streaming
    const { data } = await isStreamAvailableQuery({
      chatflowid: props.chatflowid,
      apiHost: props.apiHost,
      onRequest: props.onRequest,
    });

    if (data) {
      setIsChatFlowAvailableToStream(data?.isStreaming ?? false);
    }

    // Get the chatbotConfig
    const result = await getChatbotConfig({
      chatflowid: props.chatflowid,
      apiHost: props.apiHost,
      onRequest: props.onRequest,
    });

    if (result.data) {
      const chatbotConfig = result.data;

      if (chatbotConfig.flowData) {
        const nodes = JSON.parse(chatbotConfig.flowData).nodes ?? [];
        const startNode = nodes.find((node: any) => node.data.name === 'startAgentflow');
        if (startNode) {
          const startInputType = startNode.data.inputs?.startInputType;
          setStartInputType(startInputType);

          const formInputTypes = startNode.data.inputs?.formInputTypes;
          /* example:
          "formInputTypes": [
              {
                "type": "string",
                "label": "From",
                "name": "from",
                "addOptions": ""
              },
              {
                "type": "number",
                "label": "Subject",
                "name": "subject",
                "addOptions": ""
              },
              {
                "type": "boolean",
                "label": "Body",
                "name": "body",
                "addOptions": ""
              },
              {
                "type": "options",
                "label": "Choices",
                "name": "choices",
                "addOptions": [
                  {
                    "option": "choice 1"
                  },
                  {
                    "option": "choice 2"
                  }
                ]
              }
            ]
          */
          if (startInputType === 'formInput' && formInputTypes && formInputTypes.length > 0) {
            for (const formInputType of formInputTypes) {
              if (formInputType.type === 'options') {
                formInputType.options = formInputType.addOptions.map((option: any) => ({
                  label: option.option,
                  name: option.option,
                }));
              }
            }
            setFormInputParams(formInputTypes);
            setFormTitle(startNode.data.inputs?.formTitle);
            setFormDescription(startNode.data.inputs?.formDescription);
          }
        }
      }

      if ((!props.starterPrompts || props.starterPrompts?.length === 0) && chatbotConfig.starterPrompts) {
        const prompts: string[] = [];
        Object.getOwnPropertyNames(chatbotConfig.starterPrompts).forEach((key) => {
          prompts.push(chatbotConfig.starterPrompts[key].prompt);
        });
        setStarterPrompts(prompts.filter((prompt) => prompt !== ''));
      }
      if (chatbotConfig.chatFeedback) {
        const chatFeedbackStatus = chatbotConfig.chatFeedback.status;
        setChatFeedbackStatus(chatFeedbackStatus);
      }
      if (chatbotConfig.uploads) {
        setUploadsConfig(chatbotConfig.uploads);
      }
      if (chatbotConfig.leads) {
        setLeadsConfig(chatbotConfig.leads);
        if (chatbotConfig.leads?.status && !getLocalStorageChatflow(props.chatflowid)?.lead) {
          setMessages((prevMessages) => [...prevMessages, { message: '', type: 'leadCaptureMessage' }]);
        }
      }
      if (chatbotConfig.followUpPrompts) {
        setFollowUpPromptsStatus(chatbotConfig.followUpPrompts.status);
      }
      if (chatbotConfig.fullFileUpload) {
        setFullFileUpload(chatbotConfig.fullFileUpload.status);
        if (chatbotConfig.fullFileUpload?.allowedUploadFileTypes) {
          setFullFileUploadAllowedTypes(chatbotConfig.fullFileUpload?.allowedUploadFileTypes);
        }
      }
    }

    // eslint-disable-next-line solid/reactivity
    return () => {
      setUserInput('');
      setUploadedFiles([]);
      setLoading(false);
      setMessages([]);
    };
  });

  createEffect(() => {
    if (followUpPromptsStatus() && messages().length > 0) {
      const lastMessage = messages()[messages().length - 1];
      if (lastMessage.type === 'apiMessage' && lastMessage.followUpPrompts) {
        setFollowUpPrompts(JSON.parse(lastMessage.followUpPrompts));
      } else if (lastMessage.type === 'userMessage') {
        setFollowUpPrompts([]);
      }
    }
  });

  const isFileAllowedForUpload = (file: File) => {
    let acceptFile = false;
    if (uploadsConfig() && uploadsConfig()?.isImageUploadAllowed && uploadsConfig()?.imgUploadSizeAndTypes) {
      const fileType = file.type;
      const sizeInMB = file.size / 1024 / 1024;
      uploadsConfig()?.imgUploadSizeAndTypes.map((allowed) => {
        if (allowed.fileTypes.includes(fileType) && sizeInMB <= allowed.maxUploadSize) {
          acceptFile = true;
        }
      });
    }
    if (fullFileUpload()) {
      return true;
    }
    if (uploadsConfig() && uploadsConfig()?.isRAGFileUploadAllowed && uploadsConfig()?.fileUploadSizeAndTypes) {
      const fileExt = file.name.split('.').pop();
      if (fileExt) {
        uploadsConfig()?.fileUploadSizeAndTypes.map((allowed) => {
          if (allowed.fileTypes.length === 1 && allowed.fileTypes[0] === '*') {
            acceptFile = true;
          } else if (allowed.fileTypes.includes(`.${fileExt}`)) {
            acceptFile = true;
          }
        });
      }
    }
    if (!acceptFile) {
      alert(`Cannot upload file. Kindly check the allowed file types and maximum allowed size.`);
    }
    return acceptFile;
  };

  const handleFileChange = async (event: FileEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }
    const filesList = [];
    const uploadedFiles = [];
    for (const file of files) {
      if (isFileAllowedForUpload(file) === false) {
        return;
      }
      // Only add files
      if (
        !file.type ||
        !uploadsConfig()
          ?.imgUploadSizeAndTypes.map((allowed) => allowed.fileTypes)
          .join(',')
          .includes(file.type)
      ) {
        uploadedFiles.push({ file, type: fullFileUpload() ? 'file:full' : 'file:rag' });
      }
      const reader = new FileReader();
      const { name } = file;
      filesList.push(
        new Promise((resolve) => {
          reader.onload = (evt) => {
            if (!evt?.target?.result) {
              return;
            }
            const { result } = evt.target;
            resolve({
              data: result,
              preview: URL.createObjectURL(file),
              type: 'file',
              name: name,
              mime: file.type,
            });
          };
          reader.readAsDataURL(file);
        }),
      );
    }

    const newFiles = await Promise.all(filesList);
    setUploadedFiles(uploadedFiles);
    setPreviews((prevPreviews) => [...prevPreviews, ...(newFiles as FilePreview[])]);
  };

  const isFileUploadAllowed = () => {
    if (fullFileUpload()) {
      return true;
    } else if (uploadsConfig()?.isRAGFileUploadAllowed) {
      return true;
    }
    return false;
  };

  const handleDrag = (e: DragEvent) => {
    if (uploadsConfig()?.isImageUploadAllowed || isFileUploadAllowed()) {
      e.preventDefault();
      e.stopPropagation();
      if (e.type === 'dragenter' || e.type === 'dragover') {
        setIsDragActive(true);
      } else if (e.type === 'dragleave') {
        setIsDragActive(false);
      }
    }
  };

  const handleDrop = async (e: InputEvent | DragEvent) => {
    if (!uploadsConfig()?.isImageUploadAllowed && !isFileUploadAllowed) {
      return;
    }
    e.preventDefault();
    setIsDragActive(false);
    const files = [];
    const uploadedFiles = [];
    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
      for (const file of e.dataTransfer.files) {
        if (isFileAllowedForUpload(file) === false) {
          return;
        }
        // Only add files
        if (
          !file.type ||
          !uploadsConfig()
            ?.imgUploadSizeAndTypes.map((allowed) => allowed.fileTypes)
            .join(',')
            .includes(file.type)
        ) {
          uploadedFiles.push({ file, type: fullFileUpload() ? 'file:full' : 'file:rag' });
        }
        const reader = new FileReader();
        const { name } = file;
        files.push(
          new Promise((resolve) => {
            reader.onload = (evt) => {
              if (!evt?.target?.result) {
                return;
              }
              const { result } = evt.target;
              let previewUrl;
              if (file.type.startsWith('image/')) {
                previewUrl = URL.createObjectURL(file);
              }
              resolve({
                data: result,
                preview: previewUrl,
                type: 'file',
                name: name,
                mime: file.type,
              });
            };
            reader.readAsDataURL(file);
          }),
        );
      }

      const newFiles = await Promise.all(files);
      setUploadedFiles(uploadedFiles);
      setPreviews((prevPreviews) => [...prevPreviews, ...(newFiles as FilePreview[])]);
    }

    if (e.dataTransfer && e.dataTransfer.items) {
      for (const item of e.dataTransfer.items) {
        if (item.kind === 'string' && item.type.match('^text/uri-list')) {
          item.getAsString((s: string) => {
            const upload: FilePreview = {
              data: s,
              preview: s,
              type: 'url',
              name: s.substring(s.lastIndexOf('/') + 1),
              mime: '',
            };
            setPreviews((prevPreviews) => [...prevPreviews, upload]);
          });
        } else if (item.kind === 'string' && item.type.match('^text/html')) {
          item.getAsString((s: string) => {
            if (s.indexOf('href') === -1) return;
            //extract href
            const start = s.substring(s.indexOf('href') + 6);
            const hrefStr = start.substring(0, start.indexOf('"'));

            const upload: FilePreview = {
              data: hrefStr,
              preview: hrefStr,
              type: 'url',
              name: hrefStr.substring(hrefStr.lastIndexOf('/') + 1),
              mime: '',
            };
            setPreviews((prevPreviews) => [...prevPreviews, upload]);
          });
        }
      }
    }
  };

  const handleDeletePreview = (itemToDelete: FilePreview) => {
    if (itemToDelete.type === 'file') {
      URL.revokeObjectURL(itemToDelete.preview); // Clean up for file
    }
    setPreviews(previews().filter((item) => item !== itemToDelete));
  };

  const getInputDisabled = (): boolean => {
    const messagesArray = messages();
    const disabled =
      loading() ||
      !props.chatflowid ||
      (leadsConfig()?.status && !isLeadSaved()) ||
      (messagesArray.length > 0 &&
        messagesArray[messagesArray.length - 1]?.action &&
        Object.keys(messagesArray[messagesArray.length - 1].action as any).length > 0);
    if (disabled) {
      return true;
    }
    return false;
  };

  const previewDisplay = (item: FilePreview) => {
    if (item.mime.startsWith('image/')) {
      return (
        <button
          class="group w-12 h-12 flex items-center justify-center relative rounded-[10px] overflow-hidden transition-colors duration-200"
          onClick={() => handleDeletePreview(item)}
        >
          <img class="w-full h-full bg-cover" src={item.data as string} />
          <span class="absolute hidden group-hover:flex items-center justify-center z-10 w-full h-full top-0 left-0 bg-black/10 rounded-[10px] transition-colors duration-200">
            <TrashIcon />
          </span>
        </button>
      );
    } else {
      return <FilePreview disabled={getInputDisabled()} item={item} onDelete={() => handleDeletePreview(item)} />;
    }
  };

  return (
    <>
      {startInputType() === 'formInput' && messages().length === 1 ? (
        <FormInputView
          title={formTitle()}
          description={formDescription()}
          inputParams={formInputParams()}
          onSubmit={(formData) => handleSubmit(formData)}
          fontSize={props.fontSize}
        />
      ) : (
        <div
          ref={botContainer}
          class={
            'relative flex w-full h-full text-base overflow-hidden bg-cover bg-center flex-col items-center chatbot-container font-sans bg-white ' +
            props.class
          }
          onDragEnter={handleDrag}
        >
          {isDragActive() && (
            <div
              class="absolute top-0 left-0 bottom-0 right-0 w-full h-full z-50"
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragEnd={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            />
          )}
          {isDragActive() && (uploadsConfig()?.isImageUploadAllowed || isFileUploadAllowed()) && (
            <div class="absolute top-0 left-0 bottom-0 right-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm text-white z-40 gap-2 border-2 border-dashed">
              <h2 class="text-xl font-semibold">Drop here to upload</h2>
              <For each={[...(uploadsConfig()?.imgUploadSizeAndTypes || []), ...(uploadsConfig()?.fileUploadSizeAndTypes || [])]}>
                {(allowed) => {
                  return (
                    <>
                      <span>{allowed.fileTypes?.join(', ')}</span>
                      {allowed.maxUploadSize && <span>Max Allowed Size: {allowed.maxUploadSize} MB</span>}
                    </>
                  );
                }}
              </For>
            </div>
          )}

          {/* Шапка чата */}
          <div
            class={`sticky top-0 flex flex-row items-center justify-between w-full border-b py-3 ${
              props.isFullPage || props.isFullscreen ? 'px-4 md:px-6 lg:px-8' : 'px-4'
            } ${props.isFullPage ? 'border-t' : ''}`}
            style={{
              background: defaultTitleBackgroundColor,
              color: defaultTextColor,
            }}
          >
            {/* Кнопки слева (только в режиме bubble, не fullPage) */}
            {!props.isFullPage && (
              <div class="flex flex-row items-center gap-2">
                {/* Кнопка закрытия чата */}
                {props.closeBot && (
                  <IconButton type="button" onClick={props.closeBot} ariaLabel="Закрыть чат" icon={<XIcon color={defaultTextColor} />} />
                )}
                {/* Кнопка полноэкранного режима */}
                {props.toggleFullscreen && (
                  <IconButton
                    type="button"
                    onClick={props.toggleFullscreen}
                    ariaLabel="Развернуть на весь экран"
                    icon={<ResizeIcon color={defaultTextColor} />}
                  />
                )}
              </div>
            )}
            {/* Кнопка очистки чата справа */}
            <DeleteButton
              type="button"
              class="ml-auto text-gray-880"
              isDisabled={messages().length < 1}
              text="Очистить диалог"
              on:click={clearChat}
            />
          </div>
          <Show
            when={!hasServiceError()}
            fallback={
              <div
                class={`flex flex-col w-full h-full justify-start z-0 ${!props.isFullPage ? 'bg-white' : 'bg-[var(--chatbot-container-bg-color)]'}`}
              >
                <ServiceErrorScreen
                  onRefresh={() => {
                    setHasServiceError(false);
                    window.location.reload();
                  }}
                  class="h-full"
                />
              </div>
            }
          >
            <div class={`flex flex-col w-full h-full justify-start z-0 ${!props.isFullPage ? 'bg-white' : 'bg-[var(--chatbot-container-bg-color)]'}`}>
              <div
                ref={chatContainer}
                class="overflow-y-scroll text flex flex-col flex-grow min-w-full w-full px-3 pt-[48px] pb-20 relative scrollable-container chatbot-chat-view scroll-smooth"
              >
                {/* Приветственное сообщение в начале чата */}
                <WelcomeMessage
                  welcomeTitle={props.welcomeTitle ?? defaultWelcomeTitle}
                  welcomeText={formattedWelcomeText()}
                  fontSize={props.fontSize}
                  showWelcomeImage={typeof props.showWelcomeImage === 'boolean' ? props.showWelcomeImage : true}
                  starterPrompts={starterPrompts()}
                  isLoading={loading()}
                  onPromptClick={promptClick}
                />
                <For each={[...messages()]}>
                  {(message, index) => {
                    // Функция для получения даты из ISO строки (только дата, без времени)
                    const getDateOnly = (dateTime?: string): string | null => {
                      if (!dateTime) return null;
                      try {
                        const date = new Date(dateTime);
                        if (isNaN(date.getTime())) return null;
                        return date.toISOString().split('T')[0]; // Возвращаем YYYY-MM-DD
                      } catch {
                        return null;
                      }
                    };

                    // Проверяем, нужно ли показать разделитель даты
                    const shouldShowDateDivider = () => {
                      const currentDate = getDateOnly(message.dateTime);
                      if (!currentDate) return false;

                      // Для первого сообщения всегда показываем дату
                      if (index() === 0) return true;

                      // Для остальных - сравниваем с предыдущим сообщением
                      const prevMessage = messages()[index() - 1];
                      const prevDate = getDateOnly(prevMessage?.dateTime);

                      return prevDate !== currentDate;
                    };

                    return (
                      <>
                        {shouldShowDateDivider() && <DateDivider date={message.dateTime} />}
                        {message.type === 'userMessage' && (
                          <GuestBubble
                            message={message}
                            apiHost={props.apiHost}
                            chatflowid={props.chatflowid}
                            chatId={chatId()}
                            showAvatar={props.userMessage?.showAvatar}
                            avatarSrc={props.userMessage?.avatarSrc}
                            fontSize={props.fontSize}
                            renderHTML={props.renderHTML}
                            dateTimeToggle={props.dateTimeToggle}
                            isFullPage={props.isFullPage}
                            isFullscreen={props.isFullscreen}
                            isPopup={!props.isFullPage}
                            enableCopyMessage={props.enableCopyMessage}
                            userName={userData().user_name} // Передаем user_name (fio) для отображения
                          />
                        )}
                        {message.type === 'apiMessage' && (
                          <BotBubble
                            message={message}
                            fileAnnotations={message.fileAnnotations}
                            chatflowid={props.chatflowid}
                            chatId={chatId()}
                            apiHost={props.apiHost}
                            showAvatar={props.botMessage?.showAvatar ?? true}
                            avatarSrc={props.botMessage?.avatarSrc ?? props.titleAvatarSrc}
                            chatFeedbackStatus={index() > 0 ? chatFeedbackStatus() : false}
                            fontSize={props.fontSize}
                            isLoading={loading() && index() === messages().length - 1}
                            showAgentMessages={props.showAgentMessages}
                            botTitle={props.title}
                            handleActionClick={(elem, action) => handleActionClick(elem, action)}
                            onMessageAdd={(newMessage) => {
                              setMessages((prevMessages) => {
                                const updated = [...prevMessages, newMessage];
                                addChatMessage(updated);

                                if (
                                  newMessage.message &&
                                  typeof newMessage.message === 'string' &&
                                  (newMessage.message.includes('Чат передан оператору') || newMessage.message.includes('оператору'))
                                ) {
                                  setTimeout(() => {
                                    startAutoFAQPolling();
                                  }, 1000);
                                }

                                return updated;
                              });
                              scrollToBottom();
                            }}
                            sourceDocsTitle={props.sourceDocsTitle}
                            handleSourceDocumentsClick={(sourceDocuments) => {
                              setSourcePopupSrc(sourceDocuments);
                              setSourcePopupOpen(true);
                            }}
                            dateTimeToggle={props.dateTimeToggle}
                            renderHTML={props.renderHTML}
                            enableCopyMessage={props.enableCopyMessage}
                            isFullPage={props.isFullPage}
                            isFullscreen={props.isFullscreen}
                            isPopup={!props.isFullPage}
                            feedbackReasons={props.feedback?.reasons}
                            userData={{
                              fio: userData().fio,
                              email: userData().email,
                              user_name: userData().user_name,
                              user_id: userData().user_id,
                              login: (userData() as any).login,
                              shortname: (userData() as any).shortname,
                              orn: (userData() as any).orn,
                              phone: (userData() as any).phone,
                            }}
                            isOperatorConnected={isOperatorConnected()}
                          />
                        )}
                        {message.type === 'leadCaptureMessage' && leadsConfig()?.status && !getLocalStorageChatflow(props.chatflowid)?.lead && (
                          <LeadCaptureBubble
                            message={message}
                            chatflowid={props.chatflowid}
                            chatId={chatId()}
                            apiHost={props.apiHost}
                            fontSize={props.fontSize}
                            showAvatar={props.botMessage?.showAvatar}
                            avatarSrc={props.botMessage?.avatarSrc}
                            leadsConfig={leadsConfig()}
                            isLeadSaved={isLeadSaved()}
                            setIsLeadSaved={setIsLeadSaved}
                            setLeadEmail={setLeadEmail}
                          />
                        )}
                      </>
                    );
                  }}
                </For>
              </div>
              <Show when={messages().length > 2 && followUpPromptsStatus()}>
                <Show when={followUpPrompts().length > 0}>
                  <>
                    <div class="flex items-center gap-1 px-5">
                      <SparklesIcon class="w-4 h-4" />
                      <span class="text-sm text-gray-700">Try these prompts</span>
                    </div>
                    <div class="w-full flex flex-row flex-wrap px-5 py-[10px] gap-2">
                      <For each={[...followUpPrompts()]}>
                        {(prompt, index) => <FollowUpPromptBubble prompt={prompt} onPromptClick={() => followUpPromptClick(prompt)} />}
                      </For>
                    </div>
                  </>
                </Show>
              </Show>
              <Show when={previews().length > 0}>
                <div class="w-full flex items-center justify-start gap-2 px-5 pt-2 border-t border-[#eeeeee]">
                  <For each={[...previews()]}>{(item) => <>{previewDisplay(item)}</>}</For>
                </div>
              </Show>
              <SendArea
                placeholder={props.textInput?.placeholder}
                maxChars={props.textInput?.maxChars}
                maxCharsWarningMessage={props.textInput?.maxCharsWarningMessage}
                autoFocus={props.textInput?.autoFocus}
                fontSize={props.fontSize}
                disabled={getInputDisabled()}
                inputValue={userInput()}
                onInputChange={(value) => setUserInput(value)}
                onSubmit={handleSubmit}
                uploadsConfig={uploadsConfig()}
                isFullFileUpload={fullFileUpload()}
                fullFileUploadAllowedTypes={fullFileUploadAllowedTypes()}
                setPreviews={setPreviews}
                handleFileChange={handleFileChange}
                enableInputHistory={true}
                maxHistorySize={10}
                isFullscreen={props.isFullscreen}
              />
              <Badge footer={props.footer} botContainer={botContainer} showBadge={props.showBadge} />
            </div>
          </Show>
        </div>
      )}
      {sourcePopupOpen() && <Popup isOpen={sourcePopupOpen()} value={sourcePopupSrc()} onClose={() => setSourcePopupOpen(false)} />}

      {disclaimerPopupOpen() && (
        <DisclaimerPopup
          isOpen={disclaimerPopupOpen()}
          onAccept={handleDisclaimerAccept}
          title={props.disclaimer?.title}
          message={props.disclaimer?.message}
          buttonText={props.disclaimer?.buttonText}
          denyButtonText={props.disclaimer?.denyButtonText}
          onDeny={props.closeBot}
          isFullPage={props.isFullPage}
        />
      )}

      {openFeedbackDialog() && (
        <FeedbackDialog
          isOpen={openFeedbackDialog()}
          onClose={() => {
            setOpenFeedbackDialog(false);
            handleSubmitFeedback();
          }}
          onSubmit={handleSubmitFeedback}
          feedbackValue={feedback()}
          setFeedbackValue={(value) => setFeedback(value)}
        />
      )}
    </>
  );
};
