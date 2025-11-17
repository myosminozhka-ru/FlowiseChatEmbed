type Props = {
  prompt: string;
  onPromptClick?: () => void;
  // Цвета настраиваются через Tailwind классы
};

export const StarterPromptBubble = (props: Props) => (
  <>
    <div
      data-modal-target="defaultModal"
      data-modal-toggle="defaultModal"
      class="flex justify-start items-start animate-fade-in host-container hover:brightness-90 active:brightness-75"
      onClick={() => props.onPromptClick?.()}
    >
      <span
        class="px-3 py-2.5 ml-1 whitespace-pre-wrap max-w-full rounded-lg rounded-tr-none text-gray-880 cursor-pointer"
        data-testid="host-bubble"
        style={{
          width: 'max-content',
          background: 'var(--gradient, linear-gradient(135deg, #B4FF0A 0%, #A4EB04 100%))',
        }}
      >
        {props.prompt}
      </span>
    </div>
  </>
);
