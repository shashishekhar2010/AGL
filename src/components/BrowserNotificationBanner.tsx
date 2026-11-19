import { Bell, BellOff, CheckCircle2 } from 'lucide-react';
import {
  requestBrowserNotificationPermission,
  type BrowserNotifPermission,
} from '../utils/browserNotifications';

export default function BrowserNotificationBanner({
  permission,
  onPermissionChange,
}: {
  permission: BrowserNotifPermission;
  onPermissionChange: (next: BrowserNotifPermission) => void;
}) {
  if (permission === 'unsupported' || permission === 'granted') {
    return null;
  }

  const handleEnable = async () => {
    const next = await requestBrowserNotificationPermission();
    onPermissionChange(next);
  };

  if (permission === 'denied') {
    return (
      <div className="rounded-lg bg-[#0d1016] border border-[#e8ad26]/35 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-start gap-2.5 text-[#c7d1ca]">
          <BellOff className="w-4 h-4 text-[#e8ad26] shrink-0 mt-0.5" />
          <p>
            Browser notifications are currently blocked in your browser
            settings. Click the lock/site-settings icon in Chrome&apos;s address
            bar and set <strong className="text-white">Notifications</strong> to{' '}
            <strong className="text-white">Allow</strong> so you never miss
            meetings, chats, or admin alerts.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-[#0d121a] border border-[#e8ad26]/45 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-start gap-2.5 text-xs text-[#dfe7e0]">
        <Bell className="w-4 h-4 text-[#e8ad26] shrink-0 mt-0.5" />
        <p>
          Turn on browser notifications so you receive instant Chrome/desktop
          alerts whenever Admin sends a notification, schedules a meeting, or
          someone messages you.
        </p>
      </div>
      <button
        type="button"
        onClick={handleEnable}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium uppercase tracking-[0.08em] text-white bg-[#e0231c] hover:bg-[#c81e17] rounded-md whitespace-nowrap shrink-0"
      >
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>Enable Notifications</span>
      </button>
    </div>
  );
}
