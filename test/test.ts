import { getFilesFromDataTransferItems } from "../index";

const expects = document.querySelector("#expects")!;
const support = document.querySelector("#support")!;
const fileHandleSupport = "FileSystemFileHandle" in window;

if (fileHandleSupport) {
  support.textContent =
    "✅ Your browser supports the FileSystemFileHandle object.";
} else {
  support.textContent =
    "❌ Your browser does not support FileSystemFileHandle object. This is okay, it will not factor into test results.";
  support.classList.toggle("text-red-500", true);
}

[
  {
    name: "test.txt",
    expect: [
      {
        path: "test.txt",
        handle: true,
      },
    ],
  },
  {
    name: "a",
    expect: [
      {
        path: "a/test.txt",
        handle: false,
      },
    ],
  },
  {
    name: "b",
    expect: [
      {
        path: "b/a/test.txt",
        handle: false,
      },
    ],
  },
  {
    name: "choose both a.txt & b.txt in a multi-selection",
    expect: [
      {
        path: "a.txt",
        handle: true,
      },
      {
        path: "b.txt",
        handle: true,
      },
    ],
  },
  {
    name: "choose the b directory & b.txt in a multi-selection",
    expect: [
      {
        path: "b.txt",
        handle: true,
      },
      {
        path: "b/a/test.txt",
        handle: false,
      },
    ],
  },
].forEach((expectation) => {
  const { name, expect } = expectation;
  const zone = expects.appendChild(document.createElement("div"));
  const nameDiv = zone.appendChild(document.createElement("div"));
  const resultsDiv = zone.appendChild(document.createElement("pre"));

  nameDiv.innerText = expectation.name;
  nameDiv.className = "font-mono";

  zone.className = "border border-black p-3 rounded-md";

  zone.addEventListener("dragenter", (e) => {
    zone.classList.toggle("shadow-lg", true);
    e.preventDefault();
  });

  zone.addEventListener("dragover", (e) => {
    e.preventDefault();
  });

  zone.addEventListener("dragleave", (e) => {
    zone.classList.toggle("shadow-lg", false);
    e.preventDefault();
  });

  zone.addEventListener("drop", (e) => {
    zone.classList.toggle("shadow-lg", false);
    e.preventDefault();
    getFilesFromDataTransferItems(e.dataTransfer!.items).then(
      (res) => {
        const results = [];
        let ok = true;
        res.sort((a, b) => (b.path > a.path ? -1 : 1));
        if (expect.length !== res.length) {
          results.push({
            error: `Wrong number of files received expected ${expect.length} != received ${res.length}`,
            res,
          });
          ok = false;
        }
        if (ok) {
          for (let i = 0; i < res.length; i++) {
            const e = expect[i];
            const file = res[i];
            if (file.path !== e.path) {
              results.push({
                error: `${file.path} !== ${e.path}`,
                file,
              });
              ok = false;
            } else if (fileHandleSupport && !!file.handle !== !!e.handle) {
              results.push({
                error: e.handle
                  ? "Expected a handle, didn't find one"
                  : "Did not expect a handle",
                file,
              });
              ok = false;
            } else {
              results.push({
                file,
              });
            }
          }
        }
        zone.classList.toggle("bg-red-500", !ok);
        resultsDiv.innerText = JSON.stringify(results, null, 2);
      },
      (error) => {
        console.log(error);
        zone.classList.toggle("bg-red-500", true);
        resultsDiv.innerText = JSON.stringify(error, null, 2);
      }
    );
  });
});
