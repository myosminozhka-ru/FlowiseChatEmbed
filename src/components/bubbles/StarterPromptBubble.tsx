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
      class={`px-3 py-2.5 ml-1 whitespace-pre-wrap max-w-full font-medium rounded-lg rounded-tr-none text-gray-880 animate-fade-in host-container cursor-pointer hover:brightness-90 active:brightness-75 ${
        props.disabled ? 'opacity-60 cursor-default' : ''
      }`}
      data-testid="host-bubble"
      disabled={props.disabled}
      onClick={() => !props.disabled && props.onPromptClick?.()}
      style={{
        width: 'max-content',
        background: 'var(--gradient, linear-gradient(135deg, #B4FF0A 0%, #A4EB04 100%))',
      }}
    >
      {props.prompt}
    </button>
  </>
);
