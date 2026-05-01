import { useEffect } from "react";

type ScrollLockSnapshot = {
  bodyOverflow: string;
  bodyOverscrollBehavior: string;
  bodyPaddingRight: string;
  htmlOverflow: string;
  htmlOverscrollBehavior: string;
};

let activeLocks = 0;
let snapshot: ScrollLockSnapshot | null = null;

function lockBodyScroll() {
  const body = document.body;
  const html = document.documentElement;

  if (activeLocks === 0) {
    const scrollbarWidth = window.innerWidth - html.clientWidth;
    const computedBodyPaddingRight =
      Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0;

    snapshot = {
      bodyOverflow: body.style.overflow,
      bodyOverscrollBehavior: body.style.overscrollBehavior,
      bodyPaddingRight: body.style.paddingRight,
      htmlOverflow: html.style.overflow,
      htmlOverscrollBehavior: html.style.overscrollBehavior,
    };

    body.style.overflow = "hidden";
    html.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    html.style.overscrollBehavior = "none";

    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${computedBodyPaddingRight + scrollbarWidth}px`;
    }
  }

  activeLocks += 1;

  return () => {
    activeLocks = Math.max(0, activeLocks - 1);

    if (activeLocks > 0 || !snapshot) return;

    body.style.overflow = snapshot.bodyOverflow;
    body.style.overscrollBehavior = snapshot.bodyOverscrollBehavior;
    body.style.paddingRight = snapshot.bodyPaddingRight;
    html.style.overflow = snapshot.htmlOverflow;
    html.style.overscrollBehavior = snapshot.htmlOverscrollBehavior;
    snapshot = null;
  };
}

export function useBodyScrollLock(active = true) {
  useEffect(() => {
    if (!active || typeof window === "undefined") return undefined;

    return lockBodyScroll();
  }, [active]);
}
