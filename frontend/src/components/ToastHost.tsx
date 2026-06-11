import { useEffect } from 'react';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { dismissToast } from '../features/notifications/notificationsSlice';

const toneClasses: Record<string, string> = {
  info: 'border-sky-300 bg-sky-50 text-sky-900',
  success: 'border-emerald-300 bg-emerald-50 text-emerald-900',
  warning: 'border-amber-300 bg-amber-50 text-amber-900',
  error: 'border-rose-300 bg-rose-50 text-rose-900'
};

export const ToastHost = () => {
  const dispatch = useAppDispatch();
  const toasts = useAppSelector((state) => state.notifications.toasts);

  useEffect(() => {
    const timers = toasts.map((toast) =>
      setTimeout(() => dispatch(dismissToast(toast.id)), 6000)
    );

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [dispatch, toasts]);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex w-80 flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`rounded-xl border px-4 py-3 text-sm shadow-lg ${toneClasses[toast.tone] ?? toneClasses.info}`}
          role="status"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="font-medium">{toast.message}</p>
            <button
              type="button"
              onClick={() => dispatch(dismissToast(toast.id))}
              className="text-xs uppercase tracking-wide"
              aria-label="Dismiss notification"
            >
              Close
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
