import type { CompatData, CompatStatement } from '@mdn/browser-compat-data'
import Fuse from 'fuse.js'
import { getBcdInfo } from './cli.ts'

function flattenKeys(obj: object, bottomProps: string[], acc: string[] = []): { key: string[]; value: unknown }[] {
	return Object.entries(obj).flatMap(([key, value]) => {
		if (value != null && typeof value === 'object' && !bottomProps.includes(key)) {
			return flattenKeys(value as Record<string, unknown>, bottomProps, [...acc, key])
		}

		if (bottomProps.includes(key)) {
			return [{ key: acc, value }]
		}

		return null
	}).filter((x) => x != null)
}

const bottomProps = ['__compat']
const excludeFromKeys = ['javascript', 'api', 'builtins', 'grammar', 'css', 'properties']

export function getSearchable(bcd: CompatData) {
	const bcdSearchable = flattenKeys(bcd, bottomProps).map(({ key, value }) => ({
		key,
		keywords: key.filter((k) => !excludeFromKeys.includes(k)).join(' ').replaceAll(/[^\p{L}\p{M}\p{N}]+/gu, ' ')
			.trim(),
		data: value as CompatStatement,
	}))

	const fuse = new Fuse(bcdSearchable, {
		keys: ['keywords', 'value.tags'],
	})

	return { bcdSearchable, fuse }
}

export type Result = {
	key: string[]
	keywords: string
	data: CompatStatement
}
