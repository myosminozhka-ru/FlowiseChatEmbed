import { FooterTheme } from '@/features/bubble/types';
import { Show, onCleanup, onMount } from 'solid-js';

type Props = {
  footer?: FooterTheme;
  botContainer: HTMLDivElement | undefined;
  // Цвета настраиваются через Tailwind классы
  showBadge?: boolean;
};

const defaultTextColor = 'var(--chatbot-header-color, #303235)';

export const Badge = (props: Props) => {
  let liteBadge: HTMLAnchorElement | undefined;
  let observer: MutationObserver | undefined;

  const appendBadgeIfNecessary = (mutations: MutationRecord[]) => {
    mutations.forEach((mutation) => {
      mutation.removedNodes.forEach((removedNode) => {
        if ('id' in removedNode && liteBadge && removedNode.id == 'lite-badge') {
          console.log("Sorry, you can't remove the brand 😅");
          props.botContainer?.append(liteBadge);
        }
      });
    });
  };

  onMount(() => {
    if (!document || !props.botContainer) return;
    observer = new MutationObserver(appendBadgeIfNecessary);
    observer.observe(props.botContainer, {
      subtree: false,
      childList: true,
    });
  });

  onCleanup(() => {
    if (observer) observer.disconnect();
  });

  return (
    <Show when={props.showBadge === true}>
      <Show when={props.footer?.showFooter === undefined || props.footer?.showFooter === null || props.footer?.showFooter === true}>
        <span
          class="w-full text-center px-[10px] pt-[6px] pb-[10px] m-auto text-[13px]"
          style={{
            color: defaultTextColor,
            'background-color': '#ffffff',
          }}
        >
          {/* {props.footer?.text ?? 'Разработано на'}
          <a
            ref={liteBadge}
            href={props.footer?.companyLink ?? 'https://osmi-it.ru/'}
            target="_blank"
            rel="noopener noreferrer"
            class="lite-badge"
            id="lite-badge"
            style={{ 'font-weight': 'bold', color: defaultTextColor }}
          >
            <span>&nbsp;{props.footer?.company ?? 'Osmi AI'}</span>
          </a> */}
        </span>
      </Show>
      <Show when={props.footer?.showFooter === false}>
        <span
          class="w-full text-center px-[10px] pt-[6px] pb-[10px] m-auto text-[13px]"
          style={{
            color: defaultTextColor,
            'background-color': '#ffffff',
          }}
        />
      </Show>
    </Show>
  );
};
