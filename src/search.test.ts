import { assertEquals } from '@std/assert'
import { fuse } from './search.ts'

Deno.test(fuse.search.name, () => {
	const results = fuse.search('regex unicode sets')

	const { item } = results[0]
	const { key, data } = item

	assertEquals(key, ['javascript', 'builtins', 'RegExp', 'unicodeSets'])
	assertEquals(
		data.mdn_url,
		'https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp/unicodeSets',
	)
})
