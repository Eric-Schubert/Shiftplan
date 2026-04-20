/**
 * useSwipe Composable
 *
 * Erkennt horizontale Swipe-Gesten auf einem Element.
 * Vertikales Scrollen wird nicht beeinflusst.
 */
import { ref, onMounted, onUnmounted, type Ref } from "vue";

interface SwipeOptions {
  /** Mindest-Distanz in px für einen Swipe (default: 50) */
  threshold?: number;
  /** Max. vertikale Abweichung in px (default: 100) */
  maxVerticalDistance?: number;
  /** Max. erlaubte Dauer in ms (default: 300) */
  maxDuration?: number;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

export function useSwipe(
  elementRef: Ref<HTMLElement | null>,
  options: SwipeOptions = {}
) {
  const {
    threshold = 50,
    maxVerticalDistance = 100,
    maxDuration = 300,
    onSwipeLeft,
    onSwipeRight,
  } = options;

  const isSwiping = ref(false);
  const swipeDirection = ref<"left" | "right" | null>(null);
  const swipeOffset = ref(0);

  let startX = 0;
  let startY = 0;
  let startTime = 0;

  function handleTouchStart(e: TouchEvent) {
    const touch = e.touches[0];
    if (!touch) return;

    startX = touch.clientX;
    startY = touch.clientY;
    startTime = Date.now();
    isSwiping.value = false;
    swipeDirection.value = null;
    swipeOffset.value = 0;
  }

  function handleTouchMove(e: TouchEvent) {
    const touch = e.touches[0];
    if (!touch) return;

    const diffX = touch.clientX - startX;
    const diffY = Math.abs(touch.clientY - startY);

    // Vertikale Bewegung zu groß → kein Swipe
    if (diffY > maxVerticalDistance) {
      isSwiping.value = false;
      swipeOffset.value = 0;
      return;
    }

    // Ab 20px visuelles Feedback
    if (Math.abs(diffX) > 20) {
      isSwiping.value = true;
      swipeOffset.value = Math.sign(diffX) * Math.min(Math.abs(diffX) * 0.4, 80);
    }
  }

  function handleTouchEnd(e: TouchEvent) {
    const touch = e.changedTouches[0];
    if (!touch) return;

    const diffX = touch.clientX - startX;
    const diffY = Math.abs(touch.clientY - startY);
    const duration = Date.now() - startTime;

    isSwiping.value = false;
    swipeOffset.value = 0;

    if (
      Math.abs(diffX) >= threshold &&
      diffY <= maxVerticalDistance &&
      duration <= maxDuration
    ) {
      if (diffX < 0) {
        swipeDirection.value = "left";
        onSwipeLeft?.();
      } else {
        swipeDirection.value = "right";
        onSwipeRight?.();
      }

      setTimeout(() => {
        swipeDirection.value = null;
      }, 400);
    }
  }

  onMounted(() => {
    const el = elementRef.value;
    if (!el) return;
    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: true });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });
  });

  onUnmounted(() => {
    const el = elementRef.value;
    if (!el) return;
    el.removeEventListener("touchstart", handleTouchStart);
    el.removeEventListener("touchmove", handleTouchMove);
    el.removeEventListener("touchend", handleTouchEnd);
  });

  return { isSwiping, swipeDirection, swipeOffset };
}
