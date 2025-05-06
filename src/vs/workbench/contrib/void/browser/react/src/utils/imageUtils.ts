/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { VSBuffer } from '../../../../../../../base/common/buffer.js';

/**
 * Resizes an image provided as a VSBuffer or Uint8Array. Resizing is based on OpenAI's algorithm for tokenizing images.
 * Based on https://platform.openai.com/docs/guides/vision#calculating-costs
 *
 * @param data - The VSBuffer or Uint8Array of the image to resize.
 * @returns A promise that resolves to the VSBuffer of the resized image.
 */
export async function resizeImage(data: VSBuffer | Uint8Array): Promise<VSBuffer> {
	// Convert VSBuffer to Uint8Array if needed
	const uint8Array = data instanceof VSBuffer ? data.buffer : data;

	// Create a blob from the data
	const blob = new Blob([uint8Array]);
	const img = new Image();
	const url = URL.createObjectURL(blob);
	img.src = url;

	return new Promise<VSBuffer>((resolve, reject) => {
		img.onload = () => {
			URL.revokeObjectURL(url);
			let { width, height } = img;

			// Check if resizing is needed at all
			if (width <= 768 && height <= 768) {
				resolve(data instanceof VSBuffer ? data : VSBuffer.wrap(uint8Array));
				return;
			}

			// Calculate the new dimensions while maintaining the aspect ratio
			if (width > 2048 || height > 2048) {
				const scaleFactor = 2048 / Math.max(width, height);
				width = Math.round(width * scaleFactor);
				height = Math.round(height * scaleFactor);
			}

			const scaleFactor = 768 / Math.min(width, height);
			width = Math.round(width * scaleFactor);
			height = Math.round(height * scaleFactor);

			// Create a canvas to draw the resized image
			const canvas = document.createElement('canvas');
			canvas.width = width;
			canvas.height = height;
			const ctx = canvas.getContext('2d');

			if (ctx) {
				ctx.drawImage(img, 0, 0, width, height);
				canvas.toBlob((blob) => {
					if (blob) {
						const reader = new FileReader();
						reader.onload = () => {
							if (reader.result instanceof ArrayBuffer) {
								resolve(VSBuffer.wrap(new Uint8Array(reader.result)));
							} else {
								reject(new Error('Failed to read image data as ArrayBuffer'));
							}
						};
						reader.onerror = (error) => reject(error);
						reader.readAsArrayBuffer(blob);
					} else {
						reject(new Error('Failed to create blob from canvas'));
					}
				}, 'image/png');
			} else {
				reject(new Error('Failed to get canvas context'));
			}
		};

		img.onerror = (error) => {
			URL.revokeObjectURL(url);
			reject(error);
		};
	});
}

/**
 * Detects if the clipboard contains an image
 * @returns A promise that resolves to true if the clipboard contains an image
 */
export async function hasImageInClipboard(): Promise<boolean> {
	try {
		// Check if Clipboard API is available
		if (!navigator.clipboard || !navigator.clipboard.read) {
			return false;
		}

		const items = await navigator.clipboard.read();
		for (const item of items) {
			if (item.types.some(type => type.startsWith('image/'))) {
				return true;
			}
		}
		return false;
	} catch (e) {
		// Access might be denied or not supported
		return false;
	}
}

/**
 * Reads an image from the clipboard
 * @returns A promise that resolves to the image data and mime type, or null if no image is found
 */
export async function readImageFromClipboard(): Promise<{ data: VSBuffer; mimeType: string } | null> {
	try {
		if (!navigator.clipboard || !navigator.clipboard.read) {
			return null;
		}

		const items = await navigator.clipboard.read();

		for (const item of items) {
			// Find an image type
			const imageType = item.types.find(type => type.startsWith('image/'));
			if (imageType) {
				const blob = await item.getType(imageType);
				const arrayBuffer = await blob.arrayBuffer();
				return {
					data: VSBuffer.wrap(new Uint8Array(arrayBuffer)),
					mimeType: imageType
				};
			}
		}
		return null;
	} catch (e) {
		console.error('Failed to read image from clipboard:', e);
		return null;
	}
}
