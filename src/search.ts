import bcd from '@mdn/browser-compat-data' with { type: 'json' }
import type { CompatStatement } from '@mdn/browser-compat-data'
import FuseDefault from 'fuse.js'
import type { Fuse as FuseType, FuseResult } from 'fuse.js'

// https://github.com/krisk/Fuse/issues/784
const Fuse = FuseDefault as unknown as typeof FuseType

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

export const fuse = new Fuse(bcdSearchable, {
	keys: ['keywords', 'value.tags'],
})

export type Result = FuseResult<{
	key: string[]
	keywords: string
	data: CompatStatement
}>
