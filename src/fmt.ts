import { getColorEnabled } from '@std/fmt/colors'

/**
 * Hyperlink the text.
 *
 * @example Usage
 * ```ts no-assert
 * import { hyperlink } from "./fmt.ts";
 *
 * console.log(hyperlink("Hello, world!", "https://example.com"));
 * ```
 *
 * @param text The text to hyperlink
 * @param url The URL to hyperlink to
 * @returns The hyperlinked text
 */
export function hyperlink(text: string, url: string | URL) {
	// normalize any troublesome characters/sequences and throw if invalid URL
	url = new URL(url).href
	return getColorEnabled() ? `\x1b]8;;${url}\x07${text}\x1b]8;;\x07` : text
}
