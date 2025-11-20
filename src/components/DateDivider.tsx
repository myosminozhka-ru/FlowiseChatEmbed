import { Show } from 'solid-js';

type Props = {
  date?: string;
};

const formatDate = (dateString?: string): string => {
  if (!dateString) {
    return '';
  }

  const date = new Date(dateString);

  if (isNaN(date.getTime())) {
    return '';
  }

  const today = new Date();
  const isToday = date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();

  if (isToday) {
    return 'Сегодня';
  }

  const formatter = new Intl.DateTimeFormat('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  return formatter.format(date);
};

export const DateDivider = (props: Props) => {
  const formattedDate = formatDate(props.date);

  return (
    <Show when={formattedDate}>
      <div class="flex items-center justify-center my-5">
        <div
          class="rounded-3xl text-gray-600 px-5 py-2 font-bold text-xs"
          style={{
            'background-color': 'var(--chatbot-date-divider-bg-color)',
          }}
        >
          {formattedDate}
        </div>
      </div>
    </Show>
  );
};
