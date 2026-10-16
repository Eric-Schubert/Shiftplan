import type { MessageKey } from "~/i18n/types";
import { useRequestError } from "~/composables/useRequestError";

export interface ErrorNotice {
  id: number;
  text: string;
}

/** How long a notice stays before it closes by itself. */
export const NOTICE_DURATION_MS = 8000;
let nextId = 1;

/**
 * Notices for actions that failed outside a dialog: a click on the plan, a drag on the rotation board.
 * The layout shows them (AppErrorNotices); call this in setup and `notify` from any handler.
 */
export function useErrorNotices() {
  const notices = useState<ErrorNotice[]>("error-notices", () => []);
  const message = useRequestError();

  function dismiss(id: number) {
    notices.value = notices.value.filter((notice) => notice.id !== id);
  }

  function notify(error: unknown, fallback: MessageKey) {
    const text = message(error, fallback);
    // The same failure twice in a row shows once.
    if (notices.value.some((notice) => notice.text === text)) return;
    const id = nextId++;
    notices.value = [...notices.value, { id, text }];
    setTimeout(() => dismiss(id), NOTICE_DURATION_MS);
  }

  return { notices, notify, dismiss };
}
