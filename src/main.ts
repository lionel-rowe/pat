import bcd from '@mdn/browser-compat-data' with { type: 'json' }
import type { CompatStatement } from '@mdn/browser-compat-data'
// @deno-types="https://raw.githubusercontent.com/krisk/Fuse/43eebfaa35917217848958e0ccc811ca07026737/src/index.d.ts"
import Fuse, { type FuseResult } from 'fuse.js'
import { Command } from '@cliffy/command'
import { type Border, border as defaultBorder, Table } from '@cliffy/table'
import { Select } from '@cliffy/prompt'
import { brightBlack, rgb24 } from '@std/fmt/colors'
import { hyperlink } from './fmt.ts'
import './polyfills.ts'
import { cursorUp, eraseLines } from '@cliffy/ansi/ansi-escapes'

function flattenKeys(obj: object, bottomProps: string[], acc: string[] = []): { key: string[]; value: unknown }[] {
	return Object.entries(obj).flatMap(([key, value]) => {
		if (value != null && typeof value === 'object' && !bottomProps.includes(key)) {
			return flattenKeys(value as Record<string, unknown>, bottomProps, [...acc, key])
		}
		return [{ key: acc, value }]
	})
}

const bottomProps = ['__compat']
const excludeFromKeys = ['javascript', 'api', 'builtins', 'grammar']

const bcdSearchable = flattenKeys(bcd, bottomProps).map(({ key, value }) => ({
	key,
	keywords: key.filter((k) => !excludeFromKeys.includes(k)).join(' ').replaceAll(/[^\p{L}\p{M}\p{N}]+/gu, ' ').trim(),
	data: value as CompatStatement,
}))

const fuse = new Fuse(bcdSearchable, {
	keys: ['keywords', 'value.tags'],
})

const excludeFromSupportInfo = ['ie', 'oculus']

function firstOrOnly<T>(arr: T | T[] | undefined | null, defaultVal: T): T {
	if (Array.isArray(arr)) {
		return arr[0] ?? defaultVal
	}
	return arr ?? defaultVal
}

const r: typeof String.raw = (s, ...vals) => String.raw(s, ...vals.map(RegExp.escape))

// https://github.com/c4spar/deno-cliffy/issues/765
function table(header: string[], body: string[][], border: Border = defaultBorder) {
	const { leftMid, mid, midMid, rightMid } = border
	const replacer = new RegExp(r`\n${leftMid}(?:${mid}|${midMid})+${rightMid}`, 'g')
	let rowIdx = 0

	return new Table()
		.chars(border)
		.border()
		.header(header)
		.body(body)
		.toString()
		.replace(replacer, (m) => rowIdx++ ? '' : m)
}

// green
const OLD = 0x33_e0_33
// yellow
const RECENT = 0xbb_bb_33
// red
const UNSUPPORTED = 0xee_22_22

export const cli = new Command()
	.name('pat')
	.description('Get compatibility data for JS and other web features. Powered by MDN.')
	.example(
		'usage',
		`pat set union ${brightBlack('# get results for keywords "set union", e.g. `Set.prototype.union`')}`,
	)
	.arguments('<keyword:string> [...keywords:string]')
	.action(handler)

type Result = FuseResult<{
	key: string[]
	keywords: string
	data: CompatStatement
}>

function getResultTable(result: Result) {
	const { item } = result
	const { key, data } = item

	const prelude = [
		'',
		data.mdn_url ? `${item.keywords} [${hyperlink('MDN', data.mdn_url)}]` : item.keywords,
		brightBlack(key.join('.')),
		'',
	].join('\n')

	const supportInfo = Object.entries(data.support).map(([k, v]) => {
		if (excludeFromSupportInfo.includes(k)) return null
		return [k, Array.isArray(v) ? v[0] : v] as const
	}).filter((x) => x != null)
		.map(([k, v]) => {
			return { browser: k, ...v }
		})

	return prelude + table(
		['Browser', 'Version Added', 'Bug Tracker'],
		supportInfo.map((x) => {
			const { version_added } = x
			const v = version_added === true
				? rgb24('[unknown]', RECENT)
				: version_added || rgb24('[none]', UNSUPPORTED)

			const { name: browserName, versionInfo } = getBrowserInfo(x.browser, v)

			const versionInfoFormatted = versionInfo?.release_date ? formatVersionInfo(v, versionInfo.release_date!) : v

			const bugTrackerUrl = getBugTrackerUrl(firstOrOnly(x.impl_url, null))

			const rowData = [browserName, versionInfoFormatted, bugTrackerUrl]
			return rowData
		}),
	)
}

async function handler(_options: void, ...keywords: string[]) {
	const results = fuse.search(keywords.join(' '))

	if (!results.length) {
		console.error('No results found.')
		return
	}

	let table = ''
	let resultIdx = 0

	function drawTable() {
		table = getResultTable(results[resultIdx])
		console.info(table)
	}

	drawTable()

	const maxRows = 5

	while (true) {
		resultIdx = await Select.prompt({
			message: 'View a different result',
			options: results.slice(0, 100).map((x, i) => {
				const name = `${i + 1}. ${i === resultIdx ? brightBlack('[current] ') : ''}${x.item.keywords} ${
					brightBlack(x.item.key.join('.'))
				}`

				return {
					name,
					value: i,
					disabled: i === resultIdx,
				}
			}),
			maxRows,
		})

		const linesToErase = [...table.matchAll(/\n/g)].length + maxRows - 2
		console.info(eraseLines(linesToErase))
		console.info(cursorUp(2))

		drawTable()
	}
}

function truncate(str: string, maxLength: number) {
	const chars = [...str]
	return chars.length <= maxLength ? str : chars.slice(0, maxLength).join('') + '…'
}

function getBugTrackerUrl(url: string | null) {
	if (!url) return ''

	const { host, pathname } = new URL(url)

	return hyperlink(truncate(host + pathname, 80), url)
}

function formatVersionInfo(v: string, release_date: string) {
	const { ago, rgb } = getAgo(release_date)

	const versionInfoFormatted = `${rgb24(v.padEnd(10, ' '), rgb)} ${brightBlack(ago)}`

	return versionInfoFormatted
}

if (import.meta.main) {
	await cli.parse()
}

function toRgb(rgb: number) {
	const r = rgb >> 16
	const g = (rgb >> 8) & 0xff
	const b = rgb & 0xff

	return [r, g, b]
}

function interpolateBetweenRgb(rgb1: number, rgb2: number, fraction: number): number {
	const [r1, g1, b1] = toRgb(rgb1)
	const [r2, g2, b2] = toRgb(rgb2)

	const r = Math.round(r1 + (r2 - r1) * fraction)
	const g = Math.round(g1 + (g2 - g1) * fraction)
	const b = Math.round(b1 + (b2 - b1) * fraction)

	return r << 16 | g << 8 | b
}

function getAgo(dateStr: string) {
	const duration = Temporal.Now.plainDateTimeISO().since(Temporal.PlainDateTime.from(dateStr))
	const months = duration.total({ unit: 'month', relativeTo: Temporal.Now.plainDateTimeISO() })

	type FmtInfo = { unit: 'year' | 'month' }

	const { unit }: FmtInfo = months < 6 ? { unit: 'month' } : months < 12 ? { unit: 'month' } : { unit: 'year' }

	const ago = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
		.format(-duration.total({ unit, relativeTo: Temporal.Now.plainDateTimeISO() }).toFixed(0), unit)

	// clamp 0..100
	const percent = [0, 1, months / 36].sort((a, b) => a - b)[1]
	const rgb = interpolateBetweenRgb(RECENT, OLD, percent) | 0

	return { ago, rgb }
}

function getBrowserInfo(browserId: string, version: string) {
	const browser = bcd.browsers[browserId as keyof typeof bcd.browsers]

	if (!browser) return { name: browserId, versionInfo: null }

	return {
		name: browser.name,
		versionInfo: browser.releases[version] ?? null,
	}
}
