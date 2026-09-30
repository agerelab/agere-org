// Public interface of Notifications (PRD-10). Importing it registers the "notifications" consumer.
import "./consumer";

export { handleNotification } from "./consumer";
export { archive, inbox, markAllRead, markRead, open, orgsWithUnread, unreadCount, type Inbox } from "./inbox";
export { dueTodayDigest, hourlyNotificationJobs } from "./digest";
