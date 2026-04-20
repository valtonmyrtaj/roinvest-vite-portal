const CRM_DAILY_ACTIVITY_FIXED_DATE = "06 Prill 2026";
const CRM_ALBANIAN_MONTHS = [
  "Janar",
  "Shkurt",
  "Mars",
  "Prill",
  "Maj",
  "Qershor",
  "Korrik",
  "Gusht",
  "Shtator",
  "Tetor",
  "Nëntor",
  "Dhjetor",
];

const formatCrmCurrentDate = () => {
  const now = new Date();
  return `${String(now.getDate()).padStart(2, "0")} ${CRM_ALBANIAN_MONTHS[now.getMonth()]} ${now.getFullYear()}`;
};

const installCrmDailyDateSync = () => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const windowWithFlag = window as Window & {
    __roinvestCrmDailyDateSyncInstalled?: boolean;
    __roinvestCrmDailyDateTimer?: number;
  };

  if (windowWithFlag.__roinvestCrmDailyDateSyncInstalled) {
    return;
  }

  windowWithFlag.__roinvestCrmDailyDateSyncInstalled = true;

  const replaceFixedDateLabel = () => {
    const todayLabel = formatCrmCurrentDate();

    document.querySelectorAll("span, div, p").forEach((element) => {
      if (element.textContent?.trim() === CRM_DAILY_ACTIVITY_FIXED_DATE) {
        element.textContent = todayLabel;
      }
    });
  };

  const scheduleMidnightRefresh = () => {
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 0, 0);

    windowWithFlag.__roinvestCrmDailyDateTimer = window.setTimeout(() => {
      replaceFixedDateLabel();
      scheduleMidnightRefresh();
    }, nextMidnight.getTime() - now.getTime());
  };

  replaceFixedDateLabel();

  const observer = new MutationObserver(() => {
    replaceFixedDateLabel();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  scheduleMidnightRefresh();
};

installCrmDailyDateSync();
