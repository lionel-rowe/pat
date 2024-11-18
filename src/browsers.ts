import type { BrowserName, BrowserStatement } from '@mdn/browser-compat-data'

export type BrowserSkeletons = Record<
	BrowserName,
	Omit<BrowserStatement, 'releases'> & {
		releases?: BrowserStatement['releases']
	}
>

// just skeleton info (no release info, which is time-sensitive)
export const browserSkeletons: BrowserSkeletons = {
	chrome: {
		accepts_flags: true,
		accepts_webextensions: true,
		name: 'Chrome',
		pref_url: 'chrome://flags',
		preview_name: 'Canary',
		type: 'desktop',
	},
	chrome_android: {
		accepts_flags: true,
		accepts_webextensions: false,
		name: 'Chrome Android',
		pref_url: 'chrome://flags',
		type: 'mobile',
		upstream: 'chrome',
	},
	deno: {
		accepts_flags: true,
		accepts_webextensions: false,
		name: 'Deno',
		type: 'server',
	},
	edge: {
		accepts_flags: true,
		accepts_webextensions: true,
		name: 'Edge',
		pref_url: 'about:flags',
		type: 'desktop',
		upstream: 'chrome',
	},
	firefox: {
		accepts_flags: true,
		accepts_webextensions: true,
		name: 'Firefox',
		pref_url: 'about:config',
		preview_name: 'Nightly',
		type: 'desktop',
	},
	firefox_android: {
		accepts_flags: false,
		accepts_webextensions: true,
		name: 'Firefox for Android',
		pref_url: 'about:config',
		type: 'mobile',
		upstream: 'firefox',
	},
	ie: {
		accepts_flags: false,
		accepts_webextensions: false,
		name: 'Internet Explorer',
		type: 'desktop',
	},
	nodejs: {
		accepts_flags: true,
		accepts_webextensions: false,
		name: 'Node.js',
		type: 'server',
	},
	oculus: {
		accepts_flags: true,
		accepts_webextensions: false,
		name: 'Quest Browser',
		pref_url: 'chrome://flags',
		type: 'xr',
		upstream: 'chrome_android',
	},
	opera: {
		accepts_flags: true,
		accepts_webextensions: true,
		name: 'Opera',
		pref_url: 'opera://flags',
		type: 'desktop',
		upstream: 'chrome',
	},
	opera_android: {
		accepts_flags: false,
		accepts_webextensions: false,
		name: 'Opera Android',
		type: 'mobile',
		upstream: 'chrome_android',
	},
	safari: {
		accepts_flags: true,
		accepts_webextensions: true,
		name: 'Safari',
		preview_name: 'TP',
		type: 'desktop',
	},
	safari_ios: {
		accepts_flags: true,
		accepts_webextensions: true,
		name: 'Safari on iOS',
		type: 'mobile',
		upstream: 'safari',
	},
	samsunginternet_android: {
		accepts_flags: false,
		accepts_webextensions: false,
		name: 'Samsung Internet',
		type: 'mobile',
		upstream: 'chrome_android',
	},
	webview_android: {
		accepts_flags: false,
		accepts_webextensions: false,
		name: 'WebView Android',
		type: 'mobile',
		upstream: 'chrome_android',
	},
	webview_ios: {
		accepts_flags: false,
		accepts_webextensions: false,
		name: 'WebView on iOS',
		type: 'mobile',
		upstream: 'safari_ios',
	},
}
