import bcd from '@mdn/browser-compat-data' with { type: 'json' }
import type { CompatStatement } from '@mdn/browser-compat-data'
// @deno-types="https://raw.githubusercontent.com/krisk/Fuse/43eebfaa35917217848958e0ccc811ca07026737/src/index.d.ts"
import Fuse from 'fuse.js'
import { Command } from '@cliffy/command'
import { brightBlack } from '@std/fmt/colors'

function hyperlink(text: string, url: string | URL) {
	return `\x1B]8;;${url}\x07${text}\x1B]8;;\x07`
}

function flattenKeys(obj: object, bottomProps: string[], acc: string[] = []): { key: string[]; value: unknown }[] {
	return Object.entries(obj).flatMap(([key, value]) => {
		if (value != null && typeof value === 'object' && !bottomProps.includes(key)) {
			return flattenKeys(value as Record<string, unknown>, bottomProps, [...acc, key])
		}
		return [{ key: acc, value }]
	})
}

const bottomProps = ['__compat']
const excludeFromKeys = ['javascript', 'api', 'builtins']

const bcdSearchable = flattenKeys(bcd, bottomProps).map(({ key, value }) => ({
	key,
	keywords: key.filter((k) => !excludeFromKeys.includes(k)).join(' '),
	data: value as CompatStatement,
}))

const fuse = new Fuse(bcdSearchable, {
	keys: ['keywords', 'value.tags'],
})

const excludeFromSupportInfo = ['ie', 'oculus']

export const cli = new Command()
	.name('pat')
	.description('Get compatibility data for JS and other web features. Powered by MDN.')
	.example(
		'usage',
		`pat set union ${brightBlack('# get results for keywords "set union", e.g. `Set.prototype.union`')}`,
	)
	.arguments('<keyword:string> [...keywords:string]')
	.action((_options, ...keywords) => {
		const results = fuse.search(keywords.join(' '))

		if (!results.length) {
			console.error('No results found.')
			return
		}

		const { item } = results[0]
		const { key, data } = item

		console.info()

		console.info(data.mdn_url ? `${item.keywords} [${hyperlink('MDN', data.mdn_url)}]` : item.keywords)
		console.info(brightBlack(key.join('.')))

		const supportInfo = Object.entries(data.support).map(([k, v]) => {
			if (excludeFromSupportInfo.includes(k)) return null
			return [k, Array.isArray(v) ? v[0] : v] as const
		}).filter((x) => x != null)
			.map(([k, v]) => {
				return { browser: k, ...v }
			})

		console.table(supportInfo)
	})

if (import.meta.main) {
	await cli.parse()
}
