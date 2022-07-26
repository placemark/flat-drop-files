# @sec-ant/flat-drop-files

The is a fork of [placemark/flat-drop-files](https://github.com/placemark/flat-drop-files) with some modifications for it to be align with [GoogleChromeLabs/browser-fs-access](https://github.com/GoogleChromeLabs/browser-fs-access)

The input is a `dataTransfer.items` list with some optional options, and the output is a normalized list of files, each of which has an optional `handle` property, which is a [`FileSystemFileHandle`](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileHandle), an optional `directoryHandle` property, which is a [`FileSystemDirectoryHandle`](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle) and a `webkitRelativePath` property that's a reconstructed relative file path if the file locates in a directory, or an empty string `""` otherwise. The behavior of extending the `File` interface in this module is in consistent with what's done in [GoogleChromeLabs/browser-fs-access](https://github.com/GoogleChromeLabs/browser-fs-access).

This module takes care of:

- Optionally recursively collecting files within directories
- Reassembling paths of nested files and assigning them to `webkitRelativePath`s
- Adding file and directory handles to each file if [`DataTransferItem.getAsFileSystemHandle()`](<DataTransferItem.getAsFileSystemHandle()>) is supported
- Auto falling back to [`FileSystemEntry`](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemEntry) API when [`DataTransferItem.getAsFileSystemHandle()`](<DataTransferItem.getAsFileSystemHandle()>) is not supported
- Optionally whitelisting file extensions or skipping directories

This module **DOES NOT** take care of

- Ignoring junk files (You should handle this yourself after you collect the files)

### Installation

```bash
yarn add https://github.com/Sec-ant/flat-drop-files
```

### Example

```ts
import { getFilesFromDataTransferItems } from "@sec-ant/flat-drop-files";

const zone = document.getElementById("zone");

zone.addEventListener("dragenter", (e) => {
  e.preventDefault();
});

zone.addEventListener("dragover", (e) => {
  e.preventDefault();
});

zone.addEventListener("drop", (e) => {
  e.preventDefault();
  getFilesFromDataTransferItems(e.dataTransfer.items).then(
    (files) => {
      console.log(files);
    },
    {
      recursive: true,
    }
  );
});
```

### API

```ts
type SkipDirectory = (
  e: FileSystemDirectoryEntry | FileSystemDirectoryHandle
) => boolean;

interface DropOptions {
  // Set to `true` to recursively collect files in all subdirectories,
  // defaults to `false`.
  recursive?: boolean;
  // Callback to determine whether a directory should be entered, return `true` to skip.
  skipDirectory?: SkipDirectory;
  // List of allowed file extensions (with leading '.').
  extensions?: string[];
}

declare function getFilesFromDataTransferItems(
  dataTransferItems: DataTransferItemList,
  options?: DropOptions
): Promise<File[]>;
```

### Compatibility

This module is compatible with modern browsers: the baseline is browsers that support [webkitGetAsEntry](https://caniuse.com/mdn-api_datatransferitem_webkitgetasentry). It does not support IE11 or any other ancient browsers.

### Ecosystem

The [browser-fs-access](https://github.com/GoogleChromeLabs/browser-fs-access) module is highly recommended to work with the file objects returned by this module: with it, you can write back to the files using the `file.handle` property or write back to the directories where the files locate using the `file.directoryHandle` property.

### Acknowledgements

- [placemark/flat-drop-files](https://github.com/placemark/flat-drop-files)
- [GoogleChromeLabs/browser-fs-access](https://github.com/GoogleChromeLabs/browser-fs-access)

### Comments

You'll find plenty of comments in `index.ts` about different gotchas and traps in the DataTransferItem, FileSystemEntry, and other APIs. It's unfortunately easy to get these things wrong, whether it's assuming that [DataTransferItem.kind](https://developer.mozilla.org/en-US/docs/Web/API/DataTransferItem/kind) will correctly identify a directory, or forgetting to call `readEntries` on a directory reader repeatedly to page through each 100-item batch of files.
