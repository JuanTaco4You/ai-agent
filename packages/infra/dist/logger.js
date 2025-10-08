"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileLogger = void 0;
exports.createFileLogger = createFileLogger;
exports.childLogger = childLogger;
exports.createNullLogger = createNullLogger;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function ensureDir(dir) {
    try {
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
    }
    catch (_) {
        // ignore
    }
}
function errorToPOJO(err) {
    if (!err)
        return err;
    return {
        name: err.name,
        message: err.message,
        stack: err.stack,
        ...err,
    };
}
function stringifyMeta(meta) {
    try {
        if (meta instanceof Error) {
            return JSON.stringify(errorToPOJO(meta));
        }
        const replacer = (_key, value) => value instanceof Error ? errorToPOJO(value) : value;
        return JSON.stringify(meta, replacer);
    }
    catch {
        try {
            return String(meta);
        }
        catch {
            return "[Unserializable meta]";
        }
    }
}
function formatLine(level, context, msg, meta) {
    const time = new Date().toISOString();
    const base = `[${time}] [${level.toUpperCase()}] [${context}] ${msg}`;
    if (meta === undefined)
        return `${base}\n`;
    return `${base} ${stringifyMeta(meta)}\n`;
}
class FileLogger {
    stream;
    context;
    echo;
    constructor(filePath, context, echoToConsole = true) {
        ensureDir(path_1.default.dirname(filePath));
        this.stream = fs_1.default.createWriteStream(filePath, { flags: "a" });
        this.context = context;
        this.echo = echoToConsole;
    }
    write(level, msg, meta) {
        const line = formatLine(level, this.context, msg, meta);
        try {
            this.stream.write(line);
        }
        catch (_) {
            // swallow write errors; log stream may be closed during shutdown
        }
        if (this.echo) {
            const trimmed = line.trimEnd();
            if (level === "error" || level === "warn") {
                console.error(trimmed);
            }
            else {
                console.log(trimmed);
            }
        }
    }
    debug(msg, meta) {
        this.write("debug", msg, meta);
    }
    info(msg, meta) {
        this.write("info", msg, meta);
    }
    warn(msg, meta) {
        this.write("warn", msg, meta);
    }
    error(msg, meta) {
        this.write("error", msg, meta);
    }
}
exports.FileLogger = FileLogger;
function createFileLogger(filePath, context, echoToConsole = true) {
    return new FileLogger(filePath, context, echoToConsole);
}
function childLogger(parent, childContext) {
    return {
        debug: (msg, meta) => parent.debug(`${childContext}: ${msg}`, meta),
        info: (msg, meta) => parent.info(`${childContext}: ${msg}`, meta),
        warn: (msg, meta) => parent.warn(`${childContext}: ${msg}`, meta),
        error: (msg, meta) => parent.error(`${childContext}: ${msg}`, meta),
    };
}
function createNullLogger() {
    return {
        debug: () => undefined,
        info: () => undefined,
        warn: () => undefined,
        error: () => undefined,
    };
}
//# sourceMappingURL=logger.js.map