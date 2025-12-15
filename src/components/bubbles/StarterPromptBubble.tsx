type Props = {
  prompt: string;
  onPromptClick?: () => void;
  disabled?: boolean;
};

export const StarterPromptBubble = (props: Props) => (
  <>
    <button
      type="button"
      data-modal-target="defaultModal"
      data-modal-toggle="defaultModal"
      class={`flex justify-start items-start animate-fade-in host-container hover:brightness-90 active:brightness-75 ${
        props.disabled ? 'opacity-60 cursor-default' : ''
      }`}
      data-testid="host-bubble"
      disabled={props.disabled}
      onClick={() => !props.disabled && props.onPromptClick?.()}
    >
      <span
        class="px-3 py-2.5 ml-1 whitespace-pre-wrap max-w-full rounded-lg rounded-tr-none text-gray-880"
        style={{
          width: 'max-content',
          background: 'var(--gradient, linear-gradient(135deg, #B4FF0A 0%, #A4EB04 100%))',
        }}
      >
        {props.prompt}
      </span>
    </button>
  </>
);
