self.addEventListener('push', (event) => {
	if (!event.data) {
		return;
	}
	const notification = event.data.json();
	event.waitUntil(
		self.registration.showNotification(notification.title, {
			body: notification.body,
			icon: '/icon-192.png',
			badge: '/bay-compassion-logo.png',
			tag: notification.tag || notification.type,
			data: { url: notification.url || '/' },
		}),
	);
});

self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	const target = new URL(event.notification.data?.url || '/', self.location.origin).href;
	event.waitUntil(
		self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
			const existing = clients.find((client) => client.url.startsWith(self.location.origin));

			return existing ? existing.focus() : self.clients.openWindow(target);
		}),
	);
});
