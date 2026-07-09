// Notification service for event reminders
// Uses browser Notification API and localStorage for persistent reminders

export interface EventReminder {
    eventId: string;
    eventTitle: string;
    eventDate: string;
    eventTime: string | null;
    location: string | null;
    userId: string;
    notified: boolean;
}

// Request browser notification permission
export async function requestNotificationPermission(): Promise<boolean> {
    if (!("Notification" in window)) {
        console.log("This browser does not support notifications");
        return false;
    }

    if (Notification.permission === "granted") {
        return true;
    }

    if (Notification.permission !== "denied") {
        const permission = await Notification.requestPermission();
        return permission === "granted";
    }

    return false;
}

// Show a browser notification
export function showBrowserNotification(title: string, options?: NotificationOptions): void {
    if (Notification.permission === "granted") {
        new Notification(title, {
            icon: "/favicon.png",
            badge: "/favicon.png",
            ...options,
        });
    }
}

// Get stored reminders from localStorage
export function getStoredReminders(): EventReminder[] {
    const stored = localStorage.getItem("eventReminders");
    return stored ? JSON.parse(stored) : [];
}

// Save reminders to localStorage
export function saveReminders(reminders: EventReminder[]): void {
    localStorage.setItem("eventReminders", JSON.stringify(reminders));
}

// Add a new event reminder
export function addEventReminder(reminder: EventReminder): void {
    const reminders = getStoredReminders();
    const existing = reminders.findIndex(r => r.eventId === reminder.eventId && r.userId === reminder.userId);

    if (existing >= 0) {
        reminders[existing] = { ...reminders[existing], ...reminder };
    } else {
        reminders.push(reminder);
    }

    saveReminders(reminders);
}

// Remove an event reminder
export function removeEventReminder(eventId: string, userId: string): void {
    const reminders = getStoredReminders();
    const filtered = reminders.filter(r => !(r.eventId === eventId && r.userId === userId));
    saveReminders(filtered);
}

// Check if event is today
export function isEventToday(eventDate: string): boolean {
    const today = new Date();
    const eventDateObj = new Date(eventDate);
    return (
        today.getFullYear() === eventDateObj.getFullYear() &&
        today.getMonth() === eventDateObj.getMonth() &&
        today.getDate() === eventDateObj.getDate()
    );
}

// Check if event is tomorrow
export function isEventTomorrow(eventDate: string): boolean {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const eventDateObj = new Date(eventDate);
    return (
        tomorrow.getFullYear() === eventDateObj.getFullYear() &&
        tomorrow.getMonth() === eventDateObj.getMonth() &&
        tomorrow.getDate() === eventDateObj.getDate()
    );
}

// Check if event is within the next week
export function isEventThisWeek(eventDate: string): boolean {
    const today = new Date();
    const eventDateObj = new Date(eventDate);
    const diffTime = eventDateObj.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
}

// Calculate time remaining until event
export function getTimeUntilEvent(eventDate: string, eventTime: string | null): {
    days: number;
    hours: number;
    minutes: number;
    isPast: boolean;
    isToday: boolean;
} {
    const now = new Date();
    const eventDateTime = new Date(eventDate);

    // Parse event time if available
    if (eventTime) {
        const [hours, minutes] = eventTime.split(":").map(Number);
        eventDateTime.setHours(hours, minutes, 0, 0);
    } else {
        // Default to start of day if no time specified
        eventDateTime.setHours(0, 0, 0, 0);
    }

    const diffMs = eventDateTime.getTime() - now.getTime();

    if (diffMs < 0) {
        return { days: 0, hours: 0, minutes: 0, isPast: true, isToday: false };
    }

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return {
        days,
        hours,
        minutes,
        isPast: false,
        isToday: isEventToday(eventDate)
    };
}

// Format countdown string
export function formatCountdown(time: ReturnType<typeof getTimeUntilEvent>): string {
    if (time.isPast) {
        return "Event ended";
    }

    if (time.isToday) {
        if (time.hours > 0 || time.minutes > 0) {
            return `Today in ${time.hours}h ${time.minutes}m`;
        }
        return "Starting soon!";
    }

    if (time.days > 0) {
        return `${time.days}d ${time.hours}h ${time.minutes}m`;
    }

    if (time.hours > 0) {
        return `${time.hours}h ${time.minutes}m`;
    }

    return `${time.minutes}m`;
}

// Check and trigger reminders for all registered events
export function checkAndTriggerReminders(
    events: Array<{ id: string; title: string; date: string; time: string | null; location: string | null }>,
    userId: string
): void {
    const reminders = getStoredReminders();
    const userReminders = reminders.filter(r => r.userId === userId && !r.notified);

    for (const reminder of userReminders) {
        const event = events.find(e => e.id === reminder.eventId);
        if (!event) continue;

        // Check if it's today - send notification
        if (isEventToday(event.date)) {
            showBrowserNotification(
                `🎉 ${event.title} is Today!`,
                {
                    body: event.time
                        ? `Event starts at ${event.time}${event.location ? ` at ${event.location}` : ''}`
                        : `Event is happening today${event.location ? ` at ${event.location}` : ''}`,
                    tag: `event-${event.id}`,
                    requireInteraction: true,
                }
            );

            // Mark as notified
            const updatedReminders = reminders.map(r =>
                r.eventId === event.id && r.userId === userId
                    ? { ...r, notified: true }
                    : r
            );
            saveReminders(updatedReminders);
        }

        // Check if it's tomorrow - send notification
        if (isEventTomorrow(event.date)) {
            showBrowserNotification(
                `📅 ${event.title} is Tomorrow!`,
                {
                    body: event.time
                        ? `Event starts at ${event.time}${event.location ? ` at ${event.location}` : ''}`
                        : `Event is happening tomorrow${event.location ? ` at ${event.location}` : ''}`,
                    tag: `event-${event.id}`,
                }
            );
        }
    }
}

// Initialize reminder check on app load
export function initializeReminderCheck(
    events: Array<{ id: string; title: string; date: string; time: string | null; location: string | null }>,
    userId: string
): () => void {
    // Check immediately
    checkAndTriggerReminders(events, userId);

    // Check every minute
    const intervalId = setInterval(() => {
        checkAndTriggerReminders(events, userId);
    }, 60000);

    // Return cleanup function
    return () => clearInterval(intervalId);
}
