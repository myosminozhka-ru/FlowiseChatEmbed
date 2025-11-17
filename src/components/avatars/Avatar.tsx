import { createEffect, createSignal, Show } from 'solid-js';
import { isNotEmpty } from '@/utils/index';
import { FaceIcon } from '../icons/FaceIcon';

export const Avatar = (props: { initialAvatarSrc?: string }) => {
  const [avatarSrc, setAvatarSrc] = createSignal(props.initialAvatarSrc);

  createEffect(() => {
    if (avatarSrc()?.startsWith('{{') && props.initialAvatarSrc?.startsWith('http')) setAvatarSrc(props.initialAvatarSrc);
  });

  return (
    <figure
      class="flex justify-center items-center rounded-full overflow-hidden m-0 w-10 h-10 text"
      style={{
        'background-color': 'var(--primary-color, #A4EB04)',
      }}
    >
      <Show when={isNotEmpty(avatarSrc())} fallback={<FaceIcon class="w-6 h-6" />}>
        <img src={avatarSrc()} alt="Bot avatar" class="object-cover w-full h-full" />
      </Show>
    </figure>
  );
};
