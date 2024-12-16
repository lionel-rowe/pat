import { regExpEscape, Temporal } from './ponyfills.ts'
import type { CompatData } from '@mdn/browser-compat-data'
import { Command } from '@cliffy/command'
import { type Border, border as defaultBorder, Table } from '@cliffy/table'
import { Select } from '@cliffy/prompt'
import { brightBlack, rgb24 } from '@std/fmt/colors'
import { hyperlink } from './fmt.ts'
import { cursorUp, eraseLines } from '@cliffy/ansi/ansi-escapes'
import { bcdSearchable, fuse, type Result } from './search.ts'
import { type BrowserSkeletons, browserSkeletons } from './browsers.ts'
import { get, set } from '@kitsonk/kv-toolbox/blob'

const KV_PREFIX = 'mdn/browser-compat-data'
const KV_LATEST_VERSION_TAG_KEY = [KV_PREFIX, 'latestVersionTag'] as const
const KV_DATA_KEY = [KV_PREFIX, 'data'] as const

const excludedBrowsers = ['ie', 'oculus']

function firstOrOnly<T>(arr: T | T[] | undefined | null, defaultVal: T): T {
	if (Array.isArray(arr)) {
		return arr[0] ?? defaultVal
	}
	return arr ?? defaultVal
}

const r: typeof String.raw = (s, ...vals) => String.raw(s, ...vals.map(regExpEscape))

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

const cli = new Command()
	.name('pat')
	.description('Get compatibility data for JS and other web features. Powered by MDN.')
	.example(
		'usage',
		`${
			brightBlack(
				'# get results for keywords "regex unicode sets", e.g. `javascript.builtins.RegExp.unicodeSets`',
			)
		}\npat regex unicode sets`,
	)
	.option(
		'-a, --all',
		`Include info for all browsers, including ${
			new Intl.ListFormat('en-US').format(excludedBrowsers.map((x) =>
				getBrowserInfo(browserSkeletons, x, '-1')?.name
			))
		}.`,
	)
	.option(
		'-i, --interactive',
		'Run in interactive mode. If no keywords are supplied, the program will automatically run in this mode.',
	)
	.arguments('[...keywords:string]')
	.action(handler)

cli
	.command('update')
	.description('Update the browser compat data.')
	.action(update)

async function update() {
	const { updated, latestVersionTag } = await updateBcdInfo()
	console.info(updated ? `Updated browser compat data to version ${latestVersionTag}` : 'Already up to date')
}

function getResultTable(bcd: CompatData, result: Result | null, options: Options) {
	if (!result) {
		return 'No results found'
	}

	const { key, data } = result

	const prelude = [
		'',
		data.mdn_url ? `${result.keywords} [${hyperlink('MDN', data.mdn_url)}]` : result.keywords,
		brightBlack(key.join('.')),
		'',
	].join('\n')

	const supportInfo = Object.entries(data.support).map(([k, v]) => {
		if (!options.all && excludedBrowsers.includes(k)) return null
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

			const { name: browserName, versionInfo } = getBrowserInfo(bcd.browsers, x.browser, v)

			const versionInfoFormatted = versionInfo?.release_date ? formatVersionInfo(v, versionInfo.release_date!) : v

			const bugTrackerUrl = getBugTrackerUrl(firstOrOnly(x.impl_url, null))

			const rowData = [browserName, versionInfoFormatted, bugTrackerUrl]
			return rowData
		}),
	)
}

type Options = {
	all?: boolean
	interactive?: boolean
}

async function getBcdInfo() {
	using kv = await Deno.openKv()
	const latestVersionTag = (await kv.get(KV_LATEST_VERSION_TAG_KEY)).value as string | null
	const _bcd = (await get(kv, KV_DATA_KEY)).value
	const bcd = _bcd ? JSON.parse(new TextDecoder().decode(_bcd)) as CompatData : null

	if (bcd == null || latestVersionTag == null) {
		return null
	}

	return { latestVersionTag, bcd }
}

async function updateBcdInfo() {
	using kv = await Deno.openKv()

	const current = await getBcdInfo()

	const latestVersionTag = (await fetch('https://github.com/mdn/browser-compat-data/releases/latest', {
		method: 'HEAD',
	})).url.split('/').at(-1)!

	if (current?.latestVersionTag === latestVersionTag) {
		return { updated: false, ...current }
	}

	const downloadUrl = `https://github.com/mdn/browser-compat-data/releases/download/${latestVersionTag}/data.json`
	const bcd = await (await fetch(downloadUrl)).json() as CompatData

	await kv.set(KV_LATEST_VERSION_TAG_KEY, latestVersionTag)
	await set(kv, KV_DATA_KEY, new Blob([JSON.stringify(bcd)]))

	return { updated: true, bcd, latestVersionTag }
}

async function handler(options: Options, ...keywords: string[]) {
	if (!keywords.length) {
		options.interactive = true
	}

	let resultIdx = keywords.length ? fuse.search(keywords.join(' '))[0]?.refIndex ?? '...' : '...'

	let table = ''

	let { bcd, latestVersionTag } = await getBcdInfo() ?? {}

	if (bcd == null || latestVersionTag == null) {
		;({ bcd, latestVersionTag } = await updateBcdInfo())
	}

	function drawTable() {
		const result = bcdSearchable[resultIdx as number] ?? null

		table = getResultTable(bcd!, result, options)
		console.info(table)
	}

	drawTable()

	const maxRows = 5

	if (!options.interactive) {
		return
	}

	while (true) {
		resultIdx = await Select.prompt({
			message: 'Search for a feature',
			default: resultIdx,
			search: true,
			options: bcdSearchable.map((x, i) => {
				const name = `${x.keywords}`
				return { name, value: i }
			}),
			maxRows,
		})

		const linesToErase = [...table.matchAll(/\n/g)].length + maxRows - 2
		console.info(eraseLines(linesToErase))
		console.info(cursorUp(3))

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

function getBrowserInfo(browsers: BrowserSkeletons, browserId: string, version: string) {
	const browser = browsers[browserId as keyof typeof browsers]

	if (!browser) return { name: browserId, versionInfo: null }

	return {
		name: browser.name,
		versionInfo: browser.releases?.[version] ?? null,
	}
}

if (import.meta.main) {
	await cli.parse()
}
