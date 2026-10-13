/** Mandarin adaptation, using the app's actual Simplified Chinese control labels. */
import { translations } from '../../../../src/locales.ts';
import { lines as english } from '../narration.mjs';

export const voice = { source: 'kokoro', name: 'zf_xiaoxiao', speed: 0.96, language: 'zh' };

const t = translations.zh;
const visit = t.guestView.visitStatus;
const texts = t.guestView.identityIndicator;
const optIn = t.guestView.notificationOptIn;
const script = {
	welcome: '欢迎来到 The Bay Compassion。这份简短的指南，将帮助您用手机报名，并查看到访进度。',
	open: '用手机扫描食品市场的二维码，打开市场页面。您可以在任何地方报名，在家也可以。',
	language: '请选择您的语言。应用会记住您的选择。您随时可以在屏幕顶部更改语言。',
	closed: '如果市场尚未开放，请在星期六上午十点半回来。',
	window: '报名开放十五分钟。倒计时显示剩余时间。不用着急，提早报名并不会增加获选的机会。',
	identity: '请输入您的姓、名和手机号码。请填写完整姓名，不要只填写姓名的首字母。',
	household: '请回答有关家庭的问题。家庭总人数要包括您自己，并填写您为多少位儿童和老年人领取食品。',
	returning: '如果这部手机已经记住您，您的姓名和手机号码就已保存。请核对今天到访的家庭资料。',
	join: `填写完成后，点击“${t.submit}”。`,
	registered: `看到“${visit.registered.header}”，就表示报名成功。如果您获选，抽签后会收到号码。`,
	texts: `短信更新是可选的。如果您想接收短信，请点击“${texts.notificationsAction}”。然后阅读并同意短信授权，点击“${optIn.enable}”。`,
	draw: '上午十点四十五分进行抽签。页面会自动更新，显示您的结果。每个人的机会相同，但并不是每个人都能获得号码。',
	notSelected: `如果显示“${visit.not_placed.header}”，您可以下个星期六上午十点半再次报名。很抱歉，今天无法为您提供名额。`,
	number: `如果您获选，页面会显示“${visit.waiting.header}”和您的号码。Maya 的号码是四号。请带上报名时使用的手机，前往市场。`,
	line: `请保持这个页面打开，查看排队进度。您的号码一直显示在上方。下面的“${visit.waiting.nowCallingLabel}”，显示签到台正在呼叫的号码。`,
	display:
		'大厅屏幕也显示这些号码。请查看自己的手机，确认是否轮到您，即使大厅屏幕已经开始显示其他号码。',
	called: `领取食品从上午十一点半开始。叫到您的号码时，手机会显示“${visit.called.header}”，您的号码会变成绿色。`,
	checkin: '请现在前往签到台。在报名时使用的手机上，出示您的号码。我们不接受屏幕截图。',
	late: '如果您稍有延迟，号码会逐渐变成黄色。请前往签到台。这个颜色提醒您，后面还有其他人在等候。',
	missed: `如果屏幕显示“${visit.no_show.header}”，而您仍在现场，请到签到台与市场工作人员联系。`,
	finished: `签到后，手机会显示“${visit.served.header}”。您的到访已完成。`,
	missedWindow: '如果您错过了报名时间，页面会提示报名已经结束。请下个星期六上午十点半回来。',
	underway: '如果市场已经开始，而您还没有签到，请与市场工作人员联系。',
	help: `想再看一遍步骤吗？请点击“${t.help.title}”，或者询问任何一位志愿者。感谢您的到来。`,
};

// Shared scene IDs and pauses; the Mandarin recording supplies measured durations.
export const lines = english.map(({ id, pause }) => {
	if (!script[id]) {
		throw new Error(`Missing Mandarin narration for ${id}`);
	}

	return {
		id,
		pause,
		text: script[id],
		...(id === 'number' ? { say: script[id].replace('Maya', '玛雅') } : {}),
	};
});
