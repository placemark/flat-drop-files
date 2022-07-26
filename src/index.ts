declare global {
  interface DataTransferItem {
    getAsFileSystemHandle?: () => Promise<
      FileSystemFileHandle | FileSystemDirectoryHandle
    >;
    getAsEntry?: DataTransferItem["webkitGetAsEntry"];
  }
  interface File {
    directoryHandle?: FileSystemDirectoryHandle;
    handle?: FileSystemFileHandle;
  }
  interface FileSystemDirectoryHandle {
    values?: () => AsyncIterableIterator<FileSystemHandle>;
  }
}

type SkipDirectory = (
  e: FileSystemDirectoryEntry | FileSystemDirectoryHandle
) => boolean;

interface DropOptions {
  recursive?: boolean;
  skipDirectory?: SkipDirectory;
  extensions?: string[];
}

function getFile(entry: FileSystemFileEntry): Promise<File> {
  return new Promise((resolve, reject) => {
    entry.file(resolve, reject);
  });
}

function readBatchesOfEntries(
  dirReader: FileSystemDirectoryReader
): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => {
    dirReader.readEntries(resolve, reject);
  });
}

async function readDir(dirEntry: FileSystemDirectoryEntry) {
  const entries = [];
  const dirReader = dirEntry.createReader();
  let batchesOfEntries: FileSystemEntry[] = [];
  do {
    batchesOfEntries = await readBatchesOfEntries(dirReader);
    entries.push(...batchesOfEntries);
  } while (batchesOfEntries.length > 0);
  return entries;
}

function isFileHandle(input: FileSystemHandle): input is FileSystemFileHandle {
  return input.kind === "file";
}

function isDirectoryHandle(
  input: FileSystemHandle
): input is FileSystemDirectoryHandle {
  return input.kind === "directory";
}

function checkAgainstExtensions(fileName: string, extensions: string[]) {
  const extension = fileName.slice(((fileName.lastIndexOf(".") - 1) >>> 0) + 1);
  return extensions.includes(extension);
}

async function getFilesFromDirectoryHandleInner(
  handle: FileSystemHandle,
  dirHandle: FileSystemDirectoryHandle | undefined,
  nestedPath: string | undefined,
  files: Promise<File>[],
  dirs: Promise<File[]>[],
  options: DropOptions
) {
  if (
    isFileHandle(handle) &&
    (!options.extensions ||
      checkAgainstExtensions(handle.name, options.extensions))
  ) {
    files.push(
      handle.getFile().then((file) => {
        if (dirHandle) {
          file.directoryHandle = dirHandle;
        }
        file.handle = handle;
        return Object.defineProperty(file, "webkitRelativePath", {
          configurable: true,
          enumerable: true,
          get: () => nestedPath ?? "",
        });
      })
    );
  } else if (
    isDirectoryHandle(handle) &&
    (options.recursive ?? false) &&
    (!options.skipDirectory || !options.skipDirectory(handle))
  ) {
    const path = nestedPath ?? handle.name;
    dirs.push(getFilesFromDirectoryHandle(handle, path, options));
  }
}

async function getFilesFromDirectoryHandle(
  dirHandle: FileSystemDirectoryHandle,
  path: string,
  options: DropOptions
): Promise<File[]> {
  const dirs: Promise<File[]>[] = [];
  const files: Promise<File>[] = [];
  if (!dirHandle.values) {
    throw new Error("FileSystemDirectoryHandle.values() is not supported");
  }
  for await (const handle of dirHandle.values()) {
    const nestedPath = `${path}/${handle.name}`;
    getFilesFromDirectoryHandleInner(
      handle,
      dirHandle,
      nestedPath,
      files,
      dirs,
      options
    );
  }
  return [...(await Promise.all(dirs)).flat(), ...(await Promise.all(files))];
}

function isFileEntry(input: FileSystemEntry): input is FileSystemFileEntry {
  return input.isFile;
}

function isDirectoryEntry(
  input: FileSystemEntry
): input is FileSystemDirectoryEntry {
  return input.isDirectory;
}

async function getFilesFromDirectoryEntryInner(
  entry: FileSystemEntry,
  nestedPath: string | undefined,
  files: Promise<File>[],
  dirs: Promise<File[]>[],
  options: DropOptions
) {
  if (
    isFileEntry(entry) &&
    (!options.extensions ||
      checkAgainstExtensions(entry.name, options.extensions))
  ) {
    files.push(
      getFile(entry).then((file) => {
        return Object.defineProperty(file, "webkitRelativePath", {
          configurable: true,
          enumerable: true,
          get: () => nestedPath ?? "",
        });
      })
    );
  } else if (
    isDirectoryEntry(entry) &&
    (options.recursive ?? false) &&
    (!options.skipDirectory || !options.skipDirectory(entry))
  ) {
    const path = nestedPath ?? entry.name;
    dirs.push(getFilesFromDirectoryEntry(entry, path, options));
  }
}

async function getFilesFromDirectoryEntry(
  dirEntry: FileSystemDirectoryEntry,
  path: string,
  options: DropOptions
): Promise<File[]> {
  const dirs: Promise<File[]>[] = [];
  const files: Promise<File>[] = [];
  for (const entry of await readDir(dirEntry)) {
    const nestedPath = `${path}/${entry.name}`;
    getFilesFromDirectoryEntryInner(entry, nestedPath, files, dirs, options);
  }
  return [...(await Promise.all(dirs)).flat(), ...(await Promise.all(files))];
}

export async function getFilesFromDataTransferItems(
  dataTransferItems: DataTransferItemList,
  options: DropOptions
): Promise<File[]> {
  const dirs: Promise<File[]>[] = [];
  const files: Promise<File>[] = [];
  const handles: Promise<FileSystemHandle>[] = [];
  const entries: FileSystemEntry[] = [];
  let handlesAvailable = false;
  for (const item of dataTransferItems) {
    if (item.kind !== "file") {
      continue;
    }
    if (item.getAsFileSystemHandle) {
      handles.push(item.getAsFileSystemHandle());
      handlesAvailable = true;
    } else {
      let entry: FileSystemEntry | null = null;
      if (item.getAsEntry) {
        entry = item.getAsEntry();
      } else if (item.webkitGetAsEntry) {
        entry = item.webkitGetAsEntry();
      }
      if (entry === null) {
        continue;
      }
      entries.push(entry);
    }
  }
  if (handlesAvailable) {
    (await Promise.all(handles)).forEach((handle) => {
      getFilesFromDirectoryHandleInner(
        handle,
        undefined,
        undefined,
        files,
        dirs,
        options
      );
    });
  } else {
    entries.forEach((entry) => {
      getFilesFromDirectoryEntryInner(entry, undefined, files, dirs, options);
    });
  }
  return [...(await Promise.all(dirs)).flat(), ...(await Promise.all(files))];
}
