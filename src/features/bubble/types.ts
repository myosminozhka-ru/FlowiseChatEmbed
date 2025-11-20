export type BubbleParams = {
  theme?: BubbleTheme;
};

export type BubbleTheme = {
  chatWindow?: ChatWindowTheme;
  button?: ButtonTheme;
  tooltip?: ToolTipTheme;
  disclaimer?: DisclaimerPopUpTheme;
  customCSS?: string;
  form?: FormTheme;
};

export type FormTheme = Record<string, never>;

export type TextInputTheme = {
  placeholder?: string;
  maxChars?: number;
  maxCharsWarningMessage?: string;
  autoFocus?: boolean;
};

export type UserMessageTheme = {
  showAvatar?: boolean;
  avatarSrc?: string;
};

export type BotMessageTheme = {
  showAvatar?: boolean;
  avatarSrc?: string;
};

export type FooterTheme = {
  showFooter?: boolean;
  text?: string;
  company?: string;
  companyLink?: string;
};

export type FeedbackTheme = {
  reasons?: string[];
};

export type ChatWindowTheme = {
  showTitle?: boolean;
  showAgentMessages?: boolean; // parameter to show agent reasonings when using agentflows
  title?: string;
  titleAvatarSrc?: string;
  welcomeTitle?: string;
  welcomeText?: string;
  showWelcomeImage?: boolean;
  errorMessage?: string;
  backgroundImage?: string;
  height?: number;
  width?: number;
  fontSize?: number;
  userMessage?: UserMessageTheme;
  botMessage?: BotMessageTheme;
  textInput?: TextInputTheme;
  feedback?: FeedbackTheme;
  footer?: FooterTheme;
  sourceDocsTitle?: string;
  starterPrompts?: string[];
  clearChatOnReload?: boolean;
  dateTimeToggle?: DateTimeToggleTheme;
  renderHTML?: boolean;
};

export type ButtonTheme = {
  size?: 'small' | 'medium' | 'large' | number; // custom size of chatbot in pixels
  customIconSrc?: string;
  bottom?: number;
  right?: number;
  dragAndDrop?: boolean; // parameter to enable drag and drop(true or false)
  autoWindowOpen?: autoWindowOpenTheme;
};

export type ToolTipTheme = {
  showTooltip?: boolean; // parameter to enable tooltip(true or false)
  tooltipMessage?: string;
  tooltipFontSize?: number;
};

export type autoWindowOpenTheme = {
  autoOpen?: boolean; //parameter to control automatic window opening
  openDelay?: number; // Optional parameter for delay time in seconds
  autoOpenOnMobile?: boolean; // Optional parameter for opening on mobile
};

export type DisclaimerPopUpTheme = {
  title?: string;
  message?: string;
  buttonText?: string;
  denyButtonText?: string;
};

export type DateTimeToggleTheme = {
  date?: boolean;
  time?: boolean;
};
