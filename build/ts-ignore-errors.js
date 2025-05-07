/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * This module is used to wrap the TypeScript compiler host to ignore errors during the build process.
 * It's used by the gulp tasks when SKIP_TYPE_CHECK environment variable is set.
 */

const ts = require('typescript');
const path = require('path');
const fs = require('fs');

/**
 * Create a TypeScript program that ignores all diagnostic errors
 */
function createNoErrorsProgram(rootNames, options, host) {
	const originalCreateProgram = ts.createProgram;

	// Override createProgram to use a custom host that ignores errors
	ts.createProgram = function (rootNames, options, host) {
		// Create a wrapper for the host to suppress errors
		const noErrorsHost = host ? Object.create(host) : {};

		// Store the original getSourceFile function if it exists
		const originalGetSourceFile = host && host.getSourceFile;

		// Override getSourceFile to ignore syntactic and semantic errors
		noErrorsHost.getSourceFile = function (fileName, languageVersion, onError, shouldCreateNewSourceFile) {
			if (originalGetSourceFile) {
				return originalGetSourceFile.call(host, fileName, languageVersion,
					// Wrap the onError callback to suppress errors
					function () { /* ignore errors */ },
					shouldCreateNewSourceFile);
			}
			return ts.sys.getSourceFile(fileName, languageVersion,
				function () { /* ignore errors */ },
				shouldCreateNewSourceFile);
		};

		// Create program with the modified host
		const program = originalCreateProgram(rootNames, options, noErrorsHost);

		// Restore the original createProgram function
		ts.createProgram = originalCreateProgram;

		// Override getSemanticDiagnostics to return empty array
		const originalGetSemanticDiagnostics = program.getSemanticDiagnostics;
		program.getSemanticDiagnostics = function () {
			return [];
		};

		// Override getSyntacticDiagnostics to return empty array
		const originalGetSyntacticDiagnostics = program.getSyntacticDiagnostics;
		program.getSyntacticDiagnostics = function () {
			return [];
		};

		// Override getDeclarationDiagnostics to return empty array
		const originalGetDeclarationDiagnostics = program.getDeclarationDiagnostics;
		program.getDeclarationDiagnostics = function () {
			return [];
		};

		return program;
	};

	// Create the program with the temporary override
	const program = originalCreateProgram(rootNames, options, host);

	// Restore the original function
	ts.createProgram = originalCreateProgram;

	return program;
}

/**
 * Install a global hook to ignore TypeScript errors when SKIP_TYPE_CHECK is set
 */
function installTypeScriptErrorSuppression() {
	// Only apply when SKIP_TYPE_CHECK is set
	if (process.env.SKIP_TYPE_CHECK) {
		console.log('TypeScript error checking is disabled for this build');

		// Store the original createProgram
		const originalCreateProgram = ts.createProgram;

		// Replace with our version
		ts.createProgram = function (rootNames, options, host) {
			return createNoErrorsProgram(rootNames, options, host);
		};

		// Also override diagnostics reporting functions
		const originalGetDiagnostics = ts.getPreEmitDiagnostics;
		ts.getPreEmitDiagnostics = function () {
			return [];
		};

		return true;
	}
	return false;
}

module.exports = {
	installTypeScriptErrorSuppression,
	createNoErrorsProgram
};
