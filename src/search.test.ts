import { assertEquals } from '@std/assert'
import { getSearchable } from './search.ts'
import bcd from '@mdn/browser-compat-data' with { type: 'json' }

Deno.test('fuse.search', () => {
	const { fuse } = getSearchable(bcd)
	const results = fuse.search('regex unicode sets')

	const { item } = results[0]
	const { key, data } = item

	assertEquals(key, ['javascript', 'builtins', 'RegExp', 'unicodeSets'])
	assertEquals(
		data.mdn_url,
		'https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp/unicodeSets',
	)
})
