import { AutomationStepInput } from "@budibase/types"
import fetch from 'node-fetch';
import { JSDOM, VirtualConsole } from 'jsdom';
import { Script } from 'vm';

/**
 * Executes JavaScript code in an isolated context with a specified timeout.
 * @param {string} script - The JavaScript code to run.
 * @param {object} context - The global variables and objects to be made available in the script.
 * @returns {Promise<any>} - Resolves with the result of the script execution.
 */
async function runjs(script: any, context = {}) {
  const JS_TIMEOUT_MS = 900000;

  try {
    var virtualConsole = new VirtualConsole();
    var stdout: any[] = [];
    
    ['log', 'info', 'warn', 'error', 'jsdomError'].forEach(method => {
      virtualConsole.on(method, (...args) => {
        stdout.push([method, ...args]);
      });
    });
    virtualConsole.sendTo(console);

    var dom = new JSDOM(``, { 
      runScripts: "dangerously", 
      resources: "usable", 
      pretendToBeVisual: true, 
      includeNodeLocations: true,
      virtualConsole 
    });
    var window = dom.window;

    // Set up window environment
    window.fetch = fetch;
    window.stdout = stdout;
    window.global = window;
    window.self = window;
    window.window = window;
    window.globalThis = window;

    // Add custom require/import functionality
    window._require = async function(url: string) {
      var response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch module from ${url}`);
      var scriptContent = await response.text();

      var scriptElement = window.document.createElement("script");
      scriptElement.textContent = scriptContent;
      window.document.body.appendChild(scriptElement);

      // Just return true because libraries are loaded into the global scope, access by window.name
      return true;
    };

    // Add context to window
    Object.assign(window, context);

    // Wrap user script in IIFE with result capture
    var wrappedScript = `
      window.__results = { out: null, done: false, error: null };
      (async () => {
        try {
          window.__results.out = await (async () => {
            ${script}
          })();
        } catch (error) {
          window.__results.error = {
            message: error.message
          };
        } finally {
          window.__results.done = true;
        }
      })();
    `;
    
    // Compile and run the script
    var vmScript = new Script(wrappedScript);
    var vmContext = dom.getInternalVMContext();;
    vmScript.runInContext(vmContext, { timeout: JS_TIMEOUT_MS });

    // Execute the script
    /* var scriptElement = window.document.createElement("script");
    scriptElement.textContent = wrappedScript;
    window.document.body.appendChild(scriptElement); */

    // Wait for completion or timeout
    var result = await Promise.race([
      new Promise((resolve, reject) => {
        var checkResult = () => {
          if (window.__results.done) {
            if (window.__results.error) {
              reject(window.__results.error);
            } else {
              resolve({
                output: window.__results.out,
                stdout: stdout
              });
            }
          } else {
            setTimeout(checkResult, 10);
          }
        };
        setTimeout(checkResult, 0);
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Script execution timed out')), JS_TIMEOUT_MS)
      )
    ]);

    // Cleanup
    //window.close();
    return result;

  } catch (error) {
    console.error(`Error executing script:`, error);
    throw error;
  }
}

export default async function run({ inputs, context }: AutomationStepInput) {

  try {

    context = {
      ...context,
    }

    var result = await runjs(inputs.code, context);

    // Catch any remaining errors
    process.on('uncaughtException', (err) => {
      console.error('NodeJS Uncaught exception:', err);
      throw err;
    });

    return {
      success: true,
      value: result.output,
      stdout: result.stdout
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      //stack: error.stack
    }
  }
  
}

