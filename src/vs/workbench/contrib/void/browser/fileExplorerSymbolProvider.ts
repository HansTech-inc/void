/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { IFileService } from '../../../../platform/files/common/files.js';
import { URI } from '../../../../base/common/uri.js';
import { AtSymbolContext } from '../common/atSymbolService.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { basename } from '../../../../base/common/resources.js';

export class FileExplorerSymbolProvider {
    constructor(
        @IFileService private readonly fileService: IFileService,
        @ILabelService private readonly labelService: ILabelService,
        @IModelService private readonly modelService: IModelService,
        @IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService,
    ) {}

    async createFileContext(filePath: string): Promise<AtSymbolContext | undefined> {
        try {
            const uri = URI.parse(filePath);
            const stat = await this.fileService.resolve(uri);

            if (stat && !stat.isDirectory) {
                return {
                    type: 'file',
                    value: uri.toString(),
                    displayName: basename(uri),
                    metadata: {
                        uri,
                        title: basename(uri),
                        description: this.labelService.getUriLabel(uri, { relative: true })
                    }
                };
            }
        } catch (e) {
            // File not found or access error
            return undefined;
        }
    }

    async createFolderContext(folderPath: string): Promise<AtSymbolContext | undefined> {
        try {
            const uri = URI.parse(folderPath);
            const stat = await this.fileService.resolve(uri);

            if (stat && stat.isDirectory) {
                return {
                    type: 'folder',
                    value: uri.toString(),
                    displayName: basename(uri),
                    metadata: {
                        uri,
                        title: basename(uri),
                        description: this.labelService.getUriLabel(uri, { relative: true })
                    }
                };
            }
        } catch (e) {
            // Folder not found or access error
            return undefined;
        }
    }

    async getFileCompletions(prefix: string): Promise<AtSymbolContext[]> {
        const results: AtSymbolContext[] = [];
        const workspaceFolders = this.workspaceContextService.getWorkspace().folders;

        // Search in each workspace folder
        for (const folder of workspaceFolders) {
            try {
                const files = await this.fileService.resolve(folder.uri);
                if (files.children) {
                    for (const child of files.children) {
                        const name = basename(child.resource);
                        if (!child.isDirectory && name.toLowerCase().includes(prefix.toLowerCase())) {
                            results.push({
                                type: 'file',
                                value: child.resource.toString(),
                                displayName: name,
                                metadata: {
                                    uri: child.resource,
                                    title: name,
                                    description: this.labelService.getUriLabel(child.resource, { relative: true })
                                }
                            });
                        }
                    }
                }
            } catch (e) {
                // Skip folders with errors
                continue;
            }
        }

        return results;
    }

    async getFolderCompletions(prefix: string): Promise<AtSymbolContext[]> {
        const results: AtSymbolContext[] = [];
        const workspaceFolders = this.workspaceContextService.getWorkspace().folders;

        // Search in each workspace folder
        for (const folder of workspaceFolders) {
            try {
                const files = await this.fileService.resolve(folder.uri);
                if (files.children) {
                    for (const child of files.children) {
                        const name = basename(child.resource);
                        if (child.isDirectory && name.toLowerCase().includes(prefix.toLowerCase())) {
                            results.push({
                                type: 'folder',
                                value: child.resource.toString(),
                                displayName: name,
                                metadata: {
                                    uri: child.resource,
                                    title: name,
                                    description: this.labelService.getUriLabel(child.resource, { relative: true })
                                }
                            });
                        }
                    }
                }
            } catch (e) {
                // Skip folders with errors
                continue;
            }
        }

        return results;
    }
}
