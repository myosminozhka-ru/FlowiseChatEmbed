import { Show, For } from 'solid-js';
import { WelcomeImage } from '../avatars/WelcomeImage';
import { StarterPromptBubble } from './StarterPromptBubble';

type WelcomeMessageProps = {
  welcomeTitle?: string;
  welcomeText?: string;
  fontSize?: number;
  showWelcomeImage?: boolean;
  starterPrompts?: string[];
  onPromptClick?: (prompt: string) => void;
  isLoading?: boolean;
};

const defaultFontSize = 'var(--chatbot-font-size, 16px)';

export const WelcomeMessage = (props: WelcomeMessageProps) => {
  return (
    <div class="mb-auto max-w-full flex flex-col gap-2 pb-5 text-center">
      {props.showWelcomeImage !== false && <WelcomeImage />}
      <Show when={props.welcomeTitle}>
        <h3
          class="text-lg font-bold m-0 text-gray-880"
          style={{
            'font-size': props.fontSize ? `${props.fontSize + 4}px` : '20px',
          }}
        >
          {props.welcomeTitle}
        </h3>
      </Show>
      <Show when={props.welcomeText}>
        <span
          class="text-gray-880"
          style={{
            'font-size': props.fontSize ? `${props.fontSize}px` : defaultFontSize,
          }}
        >
          {props.welcomeText}
        </span>
      </Show>
      <Show when={props.starterPrompts && props.starterPrompts.length > 0}>
        <div class="w-full flex flex-row flex-wrap justify-center gap-2 mt-6">
          <For each={[...(props.starterPrompts || [])]}>
            {(key) => (
              <StarterPromptBubble
                prompt={key}
                onPromptClick={() => props.onPromptClick?.(key)}
                disabled={props.isLoading}
              />
            )}
          </For>
        </div>
      </Show>
    </div>
  );
};
