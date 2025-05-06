/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { VSBuffer } from '../../../../../vs/base/common/buffer.js';
import { IVoidImagePart, IVoidImageURLPart, VoidImageMimeType } from './imageMessageTypes.js';
import {
	AnthropicLLMChatMessage,
	GeminiLLMChatMessage,
	OpenAILLMChatMessage,
	AnthropicContentBlock,
	ContentBlockParam,
	SupportedImageMimeType
} from './sendLLMMessageTypes.js';
import { ProviderName } from './voidSettingsTypes.js';



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
/**
 * Map of supported MIME types per provider
 */
const SUPPORTED_MIME_TYPES: Record<ProviderName, VoidImageMimeType[]> = {
	anthropic: [VoidImageMimeType.PNG, VoidImageMimeType.JPEG, VoidImageMimeType.GIF, VoidImageMimeType.WEBP],
	openAI: [VoidImageMimeType.PNG, VoidImageMimeType.JPEG, VoidImageMimeType.GIF, VoidImageMimeType.WEBP],
	gemini: [VoidImageMimeType.PNG, VoidImageMimeType.JPEG, VoidImageMimeType.WEBP],
	// Add other providers as they gain image support
	glama: [],
	mistral: [],
	deepseek: [],
	ollama: [],
	vLLM: [],
	openRouter: [],
	openAICompatible: [],
	groq: [],
	xAI: [],
	lmStudio: [],
	liteLLM: [],
	microsoftAzure: []
};

/**
 * Validates if image format is supported by provider
 */
function validateImageFormat(mimeType: VoidImageMimeType, providerName: ProviderName): boolean {
	const supported = SUPPORTED_MIME_TYPES[providerName];
	return supported.includes(mimeType);
}

/**
 * Formats a single image for the specified provider
 */
export function formatImageForProvider(
	image: IVoidImagePart | IVoidImageURLPart,
	providerName: ProviderName
): ContentBlockParam | AnthropicContentBlock | { text: string; inlineData?: { mimeType: string; data: string } } {
	// Validate MIME type for image data
	if (image.type === 'image' && !validateImageFormat(image.mimeType, providerName)) {
		throw new Error(`Image format ${image.mimeType} not supported by provider ${providerName}`);
	}

	// Handle URL-based images
	if (image.type === 'image_url') {
		return { type: 'text', text: `[Image URL: ${image.url}]` };
	}

	// Convert image data to base64
	const base64Data = vsBufferToBase64(image.data, image.mimeType);
	const base64Content = base64Data.split(',')[1];

	switch (providerName) {
		case 'openAI':
			return {
				type: 'image',
				source: {
					type: 'base64',
					media_type: image.mimeType as SupportedImageMimeType,
					data: base64Content
				}
			};

		case 'anthropic':
			return {
				type: 'image',
				source: {
					type: 'base64',
					media_type: image.mimeType as SupportedImageMimeType,
					data: base64Content
				}
			};

		case 'gemini':
			return {
				text: '',
				inlineData: {
					mimeType: image.mimeType,
					data: base64Content
				}
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
	images: (IVoidImagePart | IVoidImageURLPart)[],
	providerName: ProviderName
): Partial<AnthropicLLMChatMessage | OpenAILLMChatMessage | GeminiLLMChatMessage> {
	if (!images || images.length === 0) {
		return { content: text };
	}

	// Validate all images before processing
	for (const image of images) {
		if (image.type === 'image' && !validateImageFormat(image.mimeType, providerName)) {
			throw new Error(`Image format ${image.mimeType} not supported by provider ${providerName}`);
		}
	}

	// Check if provider supports images
	if (SUPPORTED_MIME_TYPES[providerName].length === 0) {
		throw new Error(`Provider ${providerName} does not support images`);
	}

	switch (providerName) {
		case 'openAI': {
			const blocks: ContentBlockParam[] = [];

			// Add images first
			for (const image of images) {
				if (image.type === 'image_url') {
					blocks.push({
						type: 'text',
						text: `[URL Image: ${image.url}]`
					});
				} else {
					const base64Data = vsBufferToBase64(image.data, image.mimeType as SupportedImageMimeType);
					blocks.push({
						type: 'image',
						source: {
							type: 'base64',
							media_type: image.mimeType as SupportedImageMimeType,
							data: base64Data.split(',')[1]
						}
					});
				}
			}

			// Add text last
			if (text) {
				blocks.push({ type: 'text', text });
			}

			return { role: 'user', content: blocks };
		}

		case 'anthropic': {
			const blocks: AnthropicContentBlock[] = [];

			// Add images first
			for (const image of images) {
				if (image.type === 'image_url') {
					blocks.push({
						type: 'text',
						text: `[Image URL: ${image.url}]`
					});
				} else {
					const base64Data = vsBufferToBase64(image.data, image.mimeType);
					blocks.push({
						type: 'image',
						source: {
							type: 'base64',
							media_type: image.mimeType as SupportedImageMimeType,
							data: base64Data.split(',')[1]
						}
					});
				}
			}

			// Add text last
			if (text) {
				blocks.push({ type: 'text', text });
			}

			return { role: 'user', content: blocks };
		}

		case 'gemini': {
			const parts: GeminiLLMChatMessage['parts'] = [];

			// Add images first
			for (const image of images) {
				if (image.type === 'image_url') {
					parts.push({ text: `[Image URL not supported: ${image.url}]` });
				} else {
					parts.push({
						text: '',
						inlineData: {
							mimeType: image.mimeType,
							data: vsBufferToBase64(image.data, image.mimeType).split(',')[1]
						}
					});
				}
			}

			// Add text last
			if (text) {
				parts.push({ text });
			}

			return { role: 'user', parts } as Partial<GeminiLLMChatMessage>;
		}

		default:
			return { role: 'user', content: text };
	}
}
