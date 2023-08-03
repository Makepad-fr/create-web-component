import { cwd } from 'node:process';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import { FolderAlreadyExistsException, InitGitRepositoryException, InstallNPMDependenciesError } from './errors.js';
import ejs from 'ejs';
import input from '@inquirer/input';
import confirm from '@inquirer/confirm';
import ora, { Ora } from 'ora';

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default async function run() {
    const componentName = await input(
        {
            message: 'What is your component name?',
            validate: (input) => getCase(input) !== undefined,
        },
    );
    const willCreateGitRepository = await confirm({
        message: 'Do you want to create a git repository for the web component?',
        default: true
    });

    let currentWorkingDirectory = cwd();
    let spinner: Ora;
    try {
        const casedComponentName = convertCase(componentName);
        spinner = ora();
        const projectFolderPath = createProjectFolder(componentName, currentWorkingDirectory, spinner);
        spinner.text = `Changing current working directory to ${projectFolderPath}`;
        process.chdir(projectFolderPath);
        currentWorkingDirectory = process.cwd();
        spinner.text = `Current working directory changed to ${projectFolderPath}`;
        if (willCreateGitRepository) {
            await createGitRepository(spinner);
        }
        const srcPath = createSourceDirectory(currentWorkingDirectory, spinner);
        copyResources(currentWorkingDirectory, srcPath, casedComponentName.kebabCase, casedComponentName.upperCamelCase, spinner);
        spinner.stop();
        const willInstallDependencies = await confirm({
            message: 'Do you want to install dependencies via npm',
            default: true
        });
        if (willInstallDependencies) {
            await installDependencies(spinner);
        }
    } catch (e) {
        if (e instanceof FolderAlreadyExistsException || e instanceof InitGitRepositoryException) {
            console.error(e.message);
            process.exit(1);
            return;
        }
        console.error(`Unknown error: ${e}`);
        process.exit(2);
    } finally {

    }
}


/**
 * Creates the folder for the given component name and in the current working directory
 * @param componentName The name of the component to create
 * @param cwd The current working directory path
 * @returns The created folder directory path
 */
function createProjectFolder(componentName: string, cwd: string, spinner: Ora) {
    spinner.start('Preparing project flder path');
    const folderPath = path.resolve(cwd, componentName);
    spinner.text = `Checking if project folder ${folderPath} exists`;
    if (fs.existsSync(folderPath)) {
        throw new FolderAlreadyExistsException(folderPath);
    }
    spinner.text = `Creating project folder ${folderPath}`;
    fs.mkdirSync(folderPath);
    spinner.text = `Project folder created at ${folderPath}`;
    return folderPath;
}

/**
 * Creates a new git repository on the current working directory
 */
async function createGitRepository(spinner: Ora) {
    try {
        spinner.text = 'Initialising git repository';
        execSync('git init');
        spinner.text = 'Git repository initialised in current working directory';
    } catch (e) {
        throw new InitGitRepositoryException(process.cwd());
    }
}

/**
 * Ask user if they wants to install dependencies, and install them if they want to install 
 * @param spinner The spinner used to pass messages to the console
 */
async function installDependencies(spinner: Ora) {
    try {
        spinner.text = 'Installing dependencies';
        execSync('npm install');
        spinner.text = 'Dependencies installed';
    } catch (e) {
        throw new InstallNPMDependenciesError(process.cwd());
    }

}

/**
 * Creates the src folder in the current working directory and returns the created folder path
 * @param cwd The current working directory to create the src older
 * @returns The created src folder path
 */
function createSourceDirectory(cwd: string, spinner: Ora) {
    spinner.text = 'Creating src folder in current working directory';
    const srcFolderPath = path.resolve(cwd, 'src');
    spinner.text = `Creating src folder under ${srcFolderPath}`;
    fs.mkdirSync(srcFolderPath);
    spinner.text = `Source folder created at: ${srcFolderPath}`;
    return srcFolderPath;
}

/**
 * Copy resources by updating necessary information, such as class name and component name. 
 * @param projectPath The root path of the project
 * @param srcPath The src directory of the project
 * @param componentName The name of the component
 * @param componentClassName The name of the class for component
 * @param spinner The spinner object used for logging messages
 */
function copyResources(projectPath: string, srcPath: string, componentName: string, componentClassName: string, spinner: Ora) {
    const templateContent: TemplateContent = {
        componentClassName: componentClassName,
        componentName: componentName
    }
    spinner.text = 'Preparing the TypeScript source path';
    const componentTsFilePath = path.resolve(srcPath, `${componentName}.ts`);
    spinner.text = `Creating ${componentTsFilePath}`;
    readAndRenderTemplate('index.ts.ejs', componentTsFilePath, templateContent);
    spinner.text = 'Preparing webpack configuration path';
    const webPackConfigurationFilePath = path.resolve(projectPath, 'webpack.config.js');
    spinner.text = `Creating webpack configuration at ${webPackConfigurationFilePath}`;
    readAndRenderTemplate('webpack.config.js.ejs', webPackConfigurationFilePath, templateContent);
    spinner.text = 'Preaparing package.json file path';
    const packageJSONFilePath = path.resolve(projectPath, 'package.json');
    spinner.text = `Creating package.json file at ${packageJSONFilePath}`;
    readAndRenderTemplate('package.json.ejs', packageJSONFilePath, templateContent);
    spinner.text = 'Preparing TypeScript configuration path';
    const tsConfigFilePath = path.resolve(projectPath,'tsconfig.json');
    spinner.text = `Creating tsconfig.json file at ${tsConfigFilePath}`;
    fs.cpSync(getTemplatePath('tsconfig.json.template'), tsConfigFilePath);
    spinner.text = 'Preparing .gitignore file path';
    const gitIgnoreFilePath = path.resolve(projectPath, '.gitignore');
    spinner.text = `Creating .gitignore file at ${gitIgnoreFilePath}`;
    fs.cpSync(getTemplatePath('gitignore'), gitIgnoreFilePath);
}


type CaseResult = {
    kebabCase: string;
    upperCamelCase: string;
};

type casing = 'snake' | 'kebab' | 'upperCamel';

/**
 * Gets the casing of a given string
 * @param str The string to get the casing
 * @returns Returns the casing of the given string. It returns undefined if the string is neither snake case nor upper camel case
 */
function getCase(str: string): casing | undefined {
    if (/^[a-z0-9_]+$/.test(str)) {
        return 'snake';
    }
    if (/^([A-Z][a-z0-9]*)+$/.test(str)) {
        return 'upperCamel';
    }
    if (/^[a-z0-9-]+$/.test(str)) {
        return 'kebab';
    }
    return undefined;
}

/**
 * Converts the given string on both kebab case and upper camel case formats
 * @param str The string to convert the case
 * @returns CaseResult element that contains both upper camel case and snake case versions of the given string 
 */
function convertCase(str: string): CaseResult {
    const casing = getCase(str)!;
    switch (casing) {
        case 'snake':
            return {
                kebabCase: snakeCaseToKebabCase(str),
                upperCamelCase: snakeCasetoUpperCamelCase(str)
            };
        case 'kebab':
            return {
                kebabCase: str,
                upperCamelCase: kebabCaseToUpperCamelCase(str)
            };
        case 'upperCamel':
            return {
                kebabCase: upperCamelCaseToKebabCase(str),
                upperCamelCase: str
            }
    }
}

/**
 * Converts a snake cased string to upper camel case 
 * @param str The snake cased string to convert to upper camel case
 * @returns The upper camel case version of the given snake cased string
 */
function snakeCasetoUpperCamelCase(str: string): string {
    return str.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
}

/**
 * Converts a snake cased string to kebab case
 * @param str The snake cased string to conver to kebab case
 * @returns The kebab cased string from the given snake cased string
 */
function snakeCaseToKebabCase(str: string): string {
    return str.replace(/_/g, '-');
}

/**
 * Converts a kebab case string to upper camel case
 * @param str The kebab case string to convert to upper camel case
 * @returns The upper camel case version of the given kebab case string
 */
function kebabCaseToUpperCamelCase(str: string): string {
    return str.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
}

/**
* Converts an upper camel case string to kebab case
 * @param str The upper camel cased string to convert to kebab case
 * @returns The kebab case string converted from given upper camel case string
 */
function upperCamelCaseToKebabCase(str: string): string {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

type TemplateContent = {
    componentName: string,
    componentClassName: string
}

/**
 * Reads and renders a template with given content
 * @param templateName the name of the template to use
 * @param destinationPath The path of the destination file
 * @param content The content of the template
 */
function readAndRenderTemplate(templateName: string, destinationPath: string, content: TemplateContent) {
    // Read the file contents
    let fileContents = fs.readFileSync(getTemplatePath(templateName), 'utf-8');
    // Render the template with the provided data
    let renderedContents = ejs.render(fileContents, content);
    // Write the new file
    fs.writeFileSync(destinationPath, renderedContents);
}

/**
 * Calculates the absolute file path of the template file
 * @param templateName The name of the template file
 * @returns The absolute path of the template file
 */
function getTemplatePath(templateName: string): string {
    return path.resolve(__dirname, '../templates', templateName);
}