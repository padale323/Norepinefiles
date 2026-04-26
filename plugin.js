/**
 * Norepinefiles Plugin - Beta 5
 * Virtual filesystem stored in localStorage.
 *
 * Commands:
 *   touch <path>               Create an empty file
 *   write <path> <content>     Write content to a file
 *   append <path> <content>    Append content to a file
 *   read <path>                Read a file
 *   rm <path>                  Delete a file
 *   cp <src> <dest>            Copy a file
 *   mv <src> <dest>            Move / rename a file
 *   ls [folder]                List files
 *   mkdir <folder>             Create a folder
 *   rmdir <folder>             Remove a folder and all its files
 *   run <path>                 Execute a .nbatch or .js file
 */
(function () {

    // ==========================================
    // STORAGE
    // ==========================================
    function loadData() {
        try {
            const raw = localStorage.getItem("norepinefiles_data");
            if (!raw) return { files: {} };
            return JSON.parse(raw);
        } catch {
            return { files: {} };
        }
    }

    function saveData(data) {
        try {
            localStorage.setItem("norepinefiles_data", JSON.stringify(data));
        } catch (e) {
            print(`<span class="danger-text">[norepinefiles] Storage full or unavailable.</span>`, true);
        }
    }

    let data = loadData();
    function save() { saveData(data); }

    // ==========================================
    // PATH HELPERS
    // ==========================================
    function normPath(p) {
        return p.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/^\/|\/$/g, "").trim();
    }

    // ==========================================
    // COMMANDS
    // ==========================================
    window.registerCommand("touch", "Create an empty file. Usage: touch <path>", function (args) {
        if (!args) return print("Usage: touch <path>");
        const path = normPath(args);
        if (!path) return print("Invalid path.");
        if (data.files.hasOwnProperty(path)) return print(`File already exists: ${path}`);
        data.files[path] = "";
        save();
        print(`Created: ${path}`);
    });

    window.registerCommand("write", "Write content to a file. Usage: write <path> <content>", function (args) {
        const idx = args.indexOf(" ");
        if (idx === -1) return print("Usage: write <path> <content>");
        const path = normPath(args.slice(0, idx));
        const content = args.slice(idx + 1);
        if (!data.files.hasOwnProperty(path)) return print(`File not found: ${path}. Use 'touch' to create it first.`);
        data.files[path] = content;
        save();
        print(`Written: ${path}`);
    });

    window.registerCommand("append", "Append content to a file. Usage: append <path> <content>", function (args) {
        const idx = args.indexOf(" ");
        if (idx === -1) return print("Usage: append <path> <content>");
        const path = normPath(args.slice(0, idx));
        const content = args.slice(idx + 1);
        if (!data.files.hasOwnProperty(path)) return print(`File not found: ${path}.`);
        data.files[path] += (data.files[path] ? "\n" : "") + content;
        save();
        print(`Appended to: ${path}`);
    });

    window.registerCommand("read", "Read a file. Usage: read <path>", function (args) {
        if (!args) return print("Usage: read <path>");
        const path = normPath(args);
        if (!data.files.hasOwnProperty(path)) return print(`File not found: ${path}`);
        const content = data.files[path];
        print("<hr>", true);
        print(content === "" ? "(empty file)" : content);
        print("<hr>", true);
    });

    window.registerCommand("rm", "Delete a file. Usage: rm <path>", function (args) {
        if (!args) return print("Usage: rm <path>");
        const path = normPath(args);
        if (!data.files.hasOwnProperty(path)) return print(`File not found: ${path}`);
        delete data.files[path];
        save();
        print(`Deleted: ${path}`);
    });

    window.registerCommand("cp", "Copy a file. Usage: cp <src> <dest>", function (args) {
        const parts = args.trim().split(" ");
        if (parts.length < 2) return print("Usage: cp <src> <dest>");
        const src = normPath(parts[0]);
        const dest = normPath(parts[1]);
        if (!data.files.hasOwnProperty(src)) return print(`File not found: ${src}`);
        if (data.files.hasOwnProperty(dest)) return print(`Destination already exists: ${dest}`);
        data.files[dest] = data.files[src];
        save();
        print(`Copied: ${src} → ${dest}`);
    });

    window.registerCommand("mv", "Move or rename a file. Usage: mv <src> <dest>", function (args) {
        const parts = args.trim().split(" ");
        if (parts.length < 2) return print("Usage: mv <src> <dest>");
        const src = normPath(parts[0]);
        let dest = normPath(parts[1]);
        if (!data.files.hasOwnProperty(src)) return print(`File not found: ${src}`);
        const destIsFolder = !dest.includes(".") && Object.keys(data.files).some(f => f.startsWith(dest + "/"));
        if (destIsFolder) {
            const filename = src.split("/").pop();
            dest = dest + "/" + filename;
        }
        if (data.files.hasOwnProperty(dest)) return print(`Destination already exists: ${dest}`);
        data.files[dest] = data.files[src];
        delete data.files[src];
        save();
        print(`Moved: ${src} → ${dest}`);
    });

    window.registerCommand("ls", "List files. Usage: ls [folder]", function (args) {
        const filter = args ? normPath(args) : "";
        const allKeys = Object.keys(data.files).sort();
        const matches = filter
            ? allKeys.filter(f => f === filter || f.startsWith(filter + "/"))
            : allKeys;
        if (!matches.length) return print(filter ? `No files in: ${filter}` : "No files.");
        const displayed = new Set();
        print("<hr>", true);
        matches.forEach(f => {
            const relative = filter ? f.slice(filter.length).replace(/^\//, "") : f;
            const parts = relative.split("/");
            if (parts.length > 1) {
                const folder = (filter ? filter + "/" : "") + parts[0];
                if (!displayed.has(folder)) {
                    displayed.add(folder);
                    print(`<span style="color:var(--blue)">📁 ${parts[0]}/</span>`, true);
                }
            } else {
                print(`   📄 ${relative}`);
            }
        });
        print("<hr>", true);
    });

    window.registerCommand("mkdir", "Create a folder. Usage: mkdir <folder>", function (args) {
        if (!args) return print("Usage: mkdir <folder>");
        const path = normPath(args) + "/.keep";
        if (data.files.hasOwnProperty(path)) return print(`Folder already exists: ${args}`);
        data.files[path] = "";
        save();
        print(`Folder created: ${normPath(args)}/`);
    });

    window.registerCommand("rmdir", "Remove a folder and all its files. Usage: rmdir <folder>", function (args) {
        if (!args) return print("Usage: rmdir <folder>");
        const folder = normPath(args);
        const toDelete = Object.keys(data.files).filter(f => f === folder || f.startsWith(folder + "/"));
        if (!toDelete.length) return print(`Folder not found: ${folder}`);
        toDelete.forEach(f => delete data.files[f]);
        save();
        print(`Removed folder and ${toDelete.length} file(s): ${folder}/`);
    });

    window.registerCommand("run", "Execute a .nbatch or .js file. Usage: run <path>", async function (args) {
        if (!args) return print("Usage: run <path>");
        const path = normPath(args);
        if (!data.files.hasOwnProperty(path)) return print(`File not found: ${path}`);
        const content = data.files[path];
        if (!content.trim()) return print(`File is empty: ${path}`);
        if (path.endsWith(".js")) {
            try {
                new Function(content)();
                print(`Executed: ${path}`);
            } catch (e) {
                print(`<span class="danger-text">[Run Error] ${e.message}</span>`, true);
            }
        } else if (path.endsWith(".nbatch")) {
            const lines = content.split("\n").map(l => l.trim()).filter(l => l && !l.startsWith("#"));
            print(`Running ${lines.length} command(s) from ${path}...`);
            for (const line of lines) {
                if (typeof window.handle === "function") await window.handle(line);
            }
            print(`Done: ${path}`);
        } else {
            print(`Unknown file type. Use .nbatch for command scripts or .js for JavaScript.`);
        }
    });

    print("[norepinefiles] Filesystem ready.");

})();
