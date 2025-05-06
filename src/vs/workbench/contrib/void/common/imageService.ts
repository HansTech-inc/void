/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { VSBuffer } from '../../../../../../../vs/base/common/buffer';
import { IVoidImagePart, VoidImageMimeType } from './imageMessageTypes';
import { AnthropicLLMChatMessage, GeminiLLMChatMessage, OpenAILLMChatMessage } from './sendLLMMessageTypes';
import { ProviderName } from './voidSettingsTypes';

/**
 * Converts base64 encoded string to VSBuffer
 */
function base64ToVSBuffer(base64: string): VSBuffer {
	// Remove data URL prefix if present
	const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
	// Convert base64 to binary string
	const binaryString = atob(base64Data);
	// Create array buffer from binary string
	const bytes = new Uint8Array(binaryString.length);
	for (let i = 0; i < binaryString.length; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}
	return VSBuffer.wrap(bytes);
}

/**
 * Converts VSBuffer to base64 encoded string
 */
function vsBufferToBase64(buffer: VSBuffer, mimeType: string): string {
	// Convert buffer to base64
	let binary = '';
	const bytes = new Uint8Array(buffer.buffer);
	const len = bytes.byteLength;
	for (let i = 0; i < len; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	const base64 = btoa(binary);
	return `data:${mimeType};base64,${base64}`;
}

/**
 * Converts a VoidImagePart to the appropriate format for each provider
 */
export function formatImageForProvider(
	image: IVoidImagePart,
	providerName: ProviderName
): Partial<AnthropicLLMChatMessage | OpenAILLMChatMessage | GeminiLLMChatMessage> {
	// Get the mime type string
	const mimeTypeStr = image.mimeType;
	const base64Data = vsBufferToBase64(image.data, mimeTypeStr);

	switch (providerName) {
		case 'openai':
			return {
				content: [{
					type: 'image_url',
					image_url: {
						url: base64Data,
						detail: 'high'
					}
				}]
			};

		case 'anthropic':
			return {
				content: [{
					type: 'image',
					source: {
						type: 'base64',
						media_type: mimeTypeStr,
						data: base64Data.split(',')[1] // Remove the data URL prefix
					}
				}]
			};

		case 'gemini':
			return {
				parts: [{
					inlineData: {
						mimeType: mimeTypeStr,
						data: base64Data.split(',')[1] // Remove the data URL prefix
					}
				}]
			};

		default:
			throw new Error(`Provider ${providerName} does not support images`);
	}
}

/**
 * Creates combined content with text and images for different providers
 */
export function createContentWithImages(
	text: string,
	images: IVoidImagePart[],
	providerName: ProviderName
): Partial<AnthropicLLMChatMessage | OpenAILLMChatMessage | GeminiLLMChatMessage> {
	if (!images || images.length === 0) {
		return { content: text };
	}

	switch (providerName) {
		case 'openai': {
			const content: OpenAILLMChatMessage['content'] = [];

			// Add images first
			for (const image of images) {
				const mimeTypeStr = image.mimeType;
				const base64Data = vsBufferToBase64(image.data, mimeTypeStr);
				content.push({
					type: 'image_url',
					image_url: {
						url: base64Data,
						detail: 'high'
					}
				});
			}

			// Add text
			if (text) {
				content.push({
					type: 'text',
					text
				});
			}

			return { content };
		}

		case 'anthropic': {
			const content: AnthropicLLMChatMessage['content'] = [];

			// Add images
			for (const image of images) {
				const mimeTypeStr = image.mimeType;
				const base64Data = vsBufferToBase64(image.data, mimeTypeStr);
				content.push({
					type: 'image',
					source: {
						type: 'base64',
						media_type: mimeTypeStr,
						data: base64Data.split(',')[1] // Remove the data URL prefix
					}
				});
			}

			// Add text
			if (text) {
				content.push({
					type: 'text',
					text
				});
			}

			return { content };
		}

		case 'gemini': {
			const parts: GeminiLLMChatMessage['parts'] = [];

			// Add images
			for (const image of images) {
				const mimeTypeStr = image.mimeType;
				const base64Data = vsBufferToBase64(image.data, mimeTypeStr);
				parts.push({
					inlineData: {
						mimeType: mimeTypeStr,
						data: base64Data.split(',')[1] // Remove the data URL prefix
					}
				});
			}

			// Add text
			if (text) {
				parts.push({
					text
				});
			}

			return { parts };
		}

		default:
			return { content: text };
	}
}
