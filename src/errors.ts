export class FolderAlreadyExistsException extends Error {
    constructor(folderPath: string) {
        const message = `A folder at ${folderPath} already exists`;
        super(message);
        this.name = 'FolderAlreadyExists';
        // This line is needed to make the .stack property work correctly
        // It's not needed if the target of the TypeScript compiler is set to ES6 or later
        if (typeof Error.captureStackTrace === 'function') {
            Error.captureStackTrace(this, this.constructor);
        } else {
            this.stack = (new Error(message)).stack;
        }
    }
}

export class InitGitRepositoryException extends Error {
    constructor(cwd: string) {
        const message = `\`git init\` command failed on: ${cwd}`;
        super(message);
        this.name = 'InitGitRepositoryException';
        // This line is needed to make the .stack property work correctly
        // It's not needed if the target of the TypeScript compiler is set to ES6 or later
        if (typeof Error.captureStackTrace === 'function') {
            Error.captureStackTrace(this, this.constructor);
        } else {
            this.stack = (new Error(message)).stack;
        }
    }
}

export class InstallNPMDependenciesError extends Error {
    constructor(cwd: string) {
        const message = `\`npm intall\` command failed on: ${cwd}`;
        super(message);
        this.name = 'InstallNPMDependenciesError';
        // This line is needed to make the .stack property work correctly
        // It's not needed if the target of the TypeScript compiler is set to ES6 or later
        if (typeof Error.captureStackTrace === 'function') {
            Error.captureStackTrace(this, this.constructor);
        } else {
            this.stack = (new Error(message)).stack;
        }
    }
}