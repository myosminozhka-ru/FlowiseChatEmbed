import { createSignal, Show, splitProps, onCleanup, createEffect } from 'solid-js';
import styles from '../../../assets/index.css';
import { BubbleButton } from './BubbleButton';
import { BubbleParams } from '../types';
import { Bot, BotProps } from '../../../components/Bot';
import Tooltip from './Tooltip';
import { getBubbleButtonSize } from '@/utils';

const defaultButtonColor = '#3B81F6';
const defaultIconColor = 'white';

export type BubbleProps = BotProps & BubbleParams;

export const Bubble = (props: BubbleProps) => {
  const [bubbleProps] = splitProps(props, ['theme']);

  const [isBotOpened, setIsBotOpened] = createSignal(false);
  const [isBotStarted, setIsBotStarted] = createSignal(false);
  const [isFullscreen, setIsFullscreen] = createSignal(false);
  const [isTransitioning, setIsTransitioning] = createSignal(false);
  const [buttonPosition, setButtonPosition] = createSignal({
    bottom: bubbleProps.theme?.button?.bottom ?? 20,
    right: bubbleProps.theme?.button?.right ?? 20,
  });

  const toggleFullscreen = () => {
    if (!isFullscreen()) {
      // Переход в полноэкранный режим: сначала исчезаем и уменьшаемся
      setIsTransitioning(true);
      // Затем перемещаемся в центр и меняем размеры
      setTimeout(() => {
        setIsFullscreen(true);
        // Затем появляемся и увеличиваемся
        setTimeout(() => {
          setIsTransitioning(false);
        }, 50);
      }, 200);
    } else {
      // Возврат из полноэкранного режима: сначала уменьшаемся и исчезаем
      setIsTransitioning(true);
      setTimeout(() => {
        setIsFullscreen(false);
        // Затем появляемся в исходном месте
        setTimeout(() => {
          setIsTransitioning(false);
        }, 50);
      }, 200);
    }
  };

  const openBot = () => {
    if (!isBotStarted()) setIsBotStarted(true);
    setIsBotOpened(true);
  };

  const closeBot = () => {
    setIsBotOpened(false);
  };

  const toggleBot = () => {
    isBotOpened() ? closeBot() : openBot();
  };

  onCleanup(() => {
    setIsBotStarted(false);
  });

  const buttonSize = getBubbleButtonSize(props.theme?.button?.size); // Default to 48px if size is not provided
  const buttonBottom = props.theme?.button?.bottom ?? 20;
  const chatWindowBottom = buttonBottom + buttonSize + 10; // Adjust the offset here for slight shift

  // Add viewport meta tag dynamically
  createEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1.0, interactive-widget=resizes-content';
    document.head.appendChild(meta);

    return () => {
      document.head.removeChild(meta);
    };
  });

  const showTooltip = bubbleProps.theme?.tooltip?.showTooltip ?? false;

  return (
    <>
      <Show when={props.theme?.customCSS}>
        <style>{props.theme?.customCSS}</style>
      </Show>
      <style>{styles}</style>
      <Tooltip
        showTooltip={showTooltip && !isBotOpened()}
        position={buttonPosition()}
        buttonSize={buttonSize}
        tooltipMessage={bubbleProps.theme?.tooltip?.tooltipMessage}
        tooltipBackgroundColor={bubbleProps.theme?.tooltip?.tooltipBackgroundColor}
        tooltipTextColor={bubbleProps.theme?.tooltip?.tooltipTextColor}
        tooltipFontSize={bubbleProps.theme?.tooltip?.tooltipFontSize} // Set the tooltip font size
      />
      <BubbleButton
        {...bubbleProps.theme?.button}
        toggleBot={toggleBot}
        isBotOpened={isBotOpened()}
        setButtonPosition={setButtonPosition}
        dragAndDrop={bubbleProps.theme?.button?.dragAndDrop ?? false}
        autoOpen={bubbleProps.theme?.button?.autoWindowOpen?.autoOpen ?? false}
        openDelay={bubbleProps.theme?.button?.autoWindowOpen?.openDelay}
        autoOpenOnMobile={bubbleProps.theme?.button?.autoWindowOpen?.autoOpenOnMobile ?? false}
      />
      <div
        part="bot"
        style={{
          height: isFullscreen() ? '100vh' : (bubbleProps.theme?.chatWindow?.height ? `${bubbleProps.theme?.chatWindow?.height.toString()}px` : 'calc(100% - 150px)'),
          width: isFullscreen() ? '100vw' : (bubbleProps.theme?.chatWindow?.width ? `${bubbleProps.theme?.chatWindow?.width.toString()}px` : undefined),
          transition: isTransitioning()
            ? 'opacity 200ms ease-out'
            : (isFullscreen() 
              ? 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1), width 300ms cubic-bezier(0.4, 0, 0.2, 1), height 300ms cubic-bezier(0.4, 0, 0.2, 1), left 300ms cubic-bezier(0.4, 0, 0.2, 1), top 300ms cubic-bezier(0.4, 0, 0.2, 1), border-radius 300ms ease-out, opacity 200ms ease-out 100ms'
              : 'transform 200ms cubic-bezier(0, 1.2, 1, 1), opacity 150ms ease-out'),
          'transform-origin': 'center center',
          transform: isFullscreen() 
            ? (isTransitioning() ? 'translate(-50%, -50%) scale(0)' : 'translate(-50%, -50%) scale(1)')
            : (isBotOpened() ? 'scale3d(1, 1, 1)' : 'scale3d(0, 0, 1)'),
          opacity: isTransitioning() ? '0' : (isFullscreen() ? '1' : (isBotOpened() ? '1' : '0')),
          'box-shadow': 'rgb(0 0 0 / 16%) 0px 5px 40px',
          'background-color': bubbleProps.theme?.chatWindow?.backgroundColor || '#ffffff',
          'background-image': bubbleProps.theme?.chatWindow?.backgroundImage ? `url(${bubbleProps.theme?.chatWindow?.backgroundImage})` : 'none',
          'background-size': 'cover',
          'background-position': 'center',
          'background-repeat': 'no-repeat',
          'z-index': isFullscreen() ? 99999999 : 42424242,
          bottom: isFullscreen() ? undefined : `${Math.min(buttonPosition().bottom + buttonSize + 10, window.innerHeight - chatWindowBottom)}px`,
          right: isFullscreen() ? undefined : `${Math.max(0, Math.min(buttonPosition().right, window.innerWidth - (bubbleProps.theme?.chatWindow?.width ?? 410) - 10))}px`,
          left: isFullscreen() ? '50%' : undefined,
          top: isFullscreen() ? '50%' : undefined,
          'border-radius': isFullscreen() ? '0' : undefined,
        }}
        class={
          `fixed ${isFullscreen() ? '' : 'sm:right-5'} ${isFullscreen() ? 'rounded-none' : 'rounded-lg'} ${isFullscreen() ? 'w-screen h-screen' : 'w-full sm:w-[400px] max-h-[704px]'}` +
          (isFullscreen() ? '' : (isBotOpened() ? ' opacity-1' : ' opacity-0 pointer-events-none'))
        }
      >
        <Show when={isBotStarted()}>
          <div class={`relative h-full ${isFullscreen() ? 'rounded-none' : 'rounded-2xl'} overflow-hidden`}>
            <Bot
              showTitle={bubbleProps.theme?.chatWindow?.showTitle}
              showAgentMessages={bubbleProps.theme?.chatWindow?.showAgentMessages}
              title={bubbleProps.theme?.chatWindow?.title}
              titleAvatarSrc={bubbleProps.theme?.chatWindow?.titleAvatarSrc}
              welcomeTitle={bubbleProps.theme?.chatWindow?.welcomeTitle}
              welcomeText={bubbleProps.theme?.chatWindow?.welcomeText}
              showWelcomeImage={bubbleProps.theme?.chatWindow?.showWelcomeImage}
              errorMessage={bubbleProps.theme?.chatWindow?.errorMessage}
              textInput={bubbleProps.theme?.chatWindow?.textInput}
              botMessage={bubbleProps.theme?.chatWindow?.botMessage}
              userMessage={bubbleProps.theme?.chatWindow?.userMessage}
              feedback={bubbleProps.theme?.chatWindow?.feedback}
              fontSize={bubbleProps.theme?.chatWindow?.fontSize}
              footer={bubbleProps.theme?.chatWindow?.footer}
              sourceDocsTitle={bubbleProps.theme?.chatWindow?.sourceDocsTitle}
              starterPrompts={bubbleProps.theme?.chatWindow?.starterPrompts}
              chatflowid={props.chatflowid}
              chatflowConfig={props.chatflowConfig}
              apiHost={props.apiHost}
              onRequest={props.onRequest}
              observersConfig={props.observersConfig}
              clearChatOnReload={bubbleProps.theme?.chatWindow?.clearChatOnReload}
              disclaimer={bubbleProps.theme?.disclaimer}
              dateTimeToggle={bubbleProps.theme?.chatWindow?.dateTimeToggle}
              renderHTML={props.theme?.chatWindow?.renderHTML}
              closeBot={closeBot}
              isFullPage={false}
              toggleFullscreen={toggleFullscreen}
              isFullscreen={isFullscreen()}
            />
          </div>
        </Show>
      </div>
    </>
  );
};
