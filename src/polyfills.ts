import 'temporal-polyfill'
import '@li/regexp-escape-polyfill/global'
import { regExpEscape } from '@li/regexp-escape-polyfill'

declare global {
	interface RegExpConstructor {
		escape: typeof regExpEscape
	}
}
