/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { VSBuffer } from '../../../base/common/buffer.js';

/**
 * Enum for supported image MIME types.
 */
export enum VoidImageMimeType {
	PNG = 'image/png',
	JPEG = 'image/jpeg',
	GIF = 'image/gif',
	WEBP = 'image/webp',
	BMP = 'image/bmp',
}

/**
 * Interface for image content in void messages
 */
export interface IVoidImagePart {
	type: 'image';
	/**
	 * The image's MIME type
	 */
	mimeType: VoidImageMimeType;
	/**
	 * The raw binary data of the image
	 */
	data: VSBuffer;
}

/**
 * Interface for image URL in void messages
 */
export interface IVoidImageURLPart {
	type: 'image_url';
	/**
	 * The image's URL
	 */
	url: string;
	/**
	 * Optional detail level
	 */
	detail?: 'low' | 'high';
}

/**
 * Type for all possible image content types
 */
export type VoidImageContent = IVoidImagePart | IVoidImageURLPart;
