import { WaveIcon } from './icons';

type ServiceErrorScreenProps = {
  onRefresh?: () => void;
  class?: string;
};

export const ServiceErrorScreen = (props: ServiceErrorScreenProps) => {
  const handleRefresh = () => {
    if (props.onRefresh) {
      props.onRefresh();
    } else {
      window.location.reload();
    }
  };

  return (
    <div class={`flex flex-col items-center justify-center w-full h-full min-h-[400px] px-4 ${props.class || ''}`}>
      <WaveIcon width="80" height="74" class="mb-6 text-[var(--primary-color)]" />
      <h2 class="text-xl font-semibold text-gray-880 mb-3 text-center">Сервис временно недоступен</h2>
      <p class="text-base text-gray-880 text-center max-w-lg mb-6">
        На сервере произошла ошибка. Попробуйте{' '}
        <button onClick={handleRefresh} class="text-blue-500 hover:underline cursor-pointer">
          обновить страницу
        </button>
        . Если не помогло, попробуйте зайти через 5 минут
      </p>
    </div>
  );
};
