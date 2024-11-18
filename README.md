# pat [![JSR](https://jsr.io/badges/@li/pat)](https://jsr.io/@li/pat)

View compatibility data for JS and other web feature from the comfort of your terminal. Powered by MDN.

`pat` is to “com**pat**ibility” as [`cat` is to “con**cat**enation”](https://en.wikipedia.org/wiki/Cat_(Unix)#:~:text=The%20name,%22to%20chain%22).

## Installation

Requires [Deno](https://deno.com/).

```sh
deno install --global --allow-net --unstable-kv jsr:@li/pat
```

## Usage

```sh
# get results for keywords "regex unicode sets", e.g. `javascript.builtins.RegExp.unicodeSets`
pat regex unicode sets
```

### Updating the browser compat data

```sh
# update the npm:@mdn/browser-compat-data dependency locally
pat update
```
