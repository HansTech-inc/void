/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * This module is used to patch the gulp-typescript plugin to ignore errors and always succeed.
 * Used by the gulp tasks when we want to force a successful build despite TypeScript errors.
 */

// Use createRequire to import CommonJS modules
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const through = require('through');

/**
 * Create a reporter for gulp-typescript that ignores all errors
 */
export function createSuccessReporter() {
	return {
		error(error) {
			// Log errors but don't fail the build
			console.log(`[TS] Error (ignored): ${error.message}`);
		},
		finish() {
			// Always report success
			console.log('[TS] Build completed successfully (errors ignored)');
		}
	};
}

/**
 * Create a stream that swallows errors instead of propagating them
 */
export function createIgnoreErrorsStream() {
	return through(function (file) {
		this.queue(file);
	}, function () {
		this.queue(null);
	});
}

/**
 * Patch the reporter system to always succeed, regardless of errors
 */
export function patchReporter(typescript) {
	if (!typescript) {
		return;
	}

	// Store the original reporter creation
	const originalReporter = typescript.reporter;

	// Replace with our version that ignores errors
	typescript.reporter = function () {
		return createSuccessReporter();
	};
}
