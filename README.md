# @placemarkio/flat-drop-files

The Drag & Drop [dataTransfer](https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer)
interface is powerful, but torturous. It has grown organically and via standards,
and is full of [footguns](https://www.wordsense.eu/footguns/) which make it trivially
easy to mess up.

This is an attempt to make it all "just work." The input is a `dataTransfer.items`
list, and the output is a normalized list of files, with a `handle` property
that's a [FileSystemFileHandle](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileHandle),
and a `path` property that's a reconstructed relative file path.

This module takes care of:

- Recursively collecting files within directories
- Reassembling paths of nested files
- Paging through directories with over 100 files
- Ignoring [junk](https://github.com/sindresorhus/junk) files like `.DS_Store`

This is at the bleeding edge of the web, so there are some caveats.

- TypeScript does not support `FileSystemFileHandle` objects yet. This module
  includes the `@types/wicg-file-system-access` module to polyfill that type until
  it is properly introduced.

### Example

```ts
import { getFilesFromDataTransferItems } from "@placemarkio/flat-drop-files";

const zone = document.getElementById('zone');

zone.addEventListener("dragenter", (e) => {
  e.preventDefault();
});

zone.addEventListener("dragover", (e) => {
  e.preventDefault();
});

zone.addEventListener("drop", (e) => {
  e.preventDefault();
  getFilesFromDataTransferItems(e.dataTransfer!.items).then(files => {
    console.log(files);
  });
});
```

### Compatibility

This module is compatible with modern browsers: the baseline is browsers
that support [webkitGetAsEntry](https://caniuse.com/mdn-api_datatransferitem_webkitgetasentry).
It does not support IE11 or any other ancient browsers.

### Ecosystem

The [browser-fs-access](https://github.com/GoogleChromeLabs/browser-fs-access) module
is highly recommended to work with the file objects returned by this module:
with it, you can write back to the files using the `file.handle` property.

### Source

This is inspired by [datatransfer-files-promise](https://github.com/anatol-grabowski/datatransfer-files-promise),
contains collected lessons from [dropzone](https://github.com/dropzone/dropzone),
and adapts its junk-file detection from Sindre Sorhus's excellent [junk](https://github.com/sindresorhus/junk) module.

### Comments

You'll find plenty of comments in `index.ts` about different gotchas and traps in the DataTransferItem, FileSystemEntry, and other APIs. It's unfortunately easy to get these things wrong, whether it's assuming that [DataTransferItem.kind](https://developer.mozilla.org/en-US/docs/Web/API/DataTransferItem/kind) will correctly identify a directory, or forgetting to call `readEntries` on a directory reader repeatedly to page through each 100-item batch of files.
