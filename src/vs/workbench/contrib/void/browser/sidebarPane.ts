/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { Registry } from '../../../../platform/registry/common/platform.js';
import {
	Extensions as ViewContainerExtensions, IViewContainersRegistry,
	ViewContainerLocation, IViewsRegistry, Extensions as ViewExtensions,
	IViewDescriptorService,
} from '../../../common/views.js';

import { Emitter } from '../../../../base/common/event.js';
import { IVoidImagePart, VoidImageMimeType } from '../common/imageMessageTypes.js';
import { IChatThreadService } from './chatThreadService.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import * as nls from '../../../../nls.js';

// import { Codicon } from '../../../../base/common/codicons.js';
// import { localize } from '../../../../nls.js';
// import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';

import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
// import { KeyCode, KeyMod } from '../../../../base/common/keyCodes.js';
import { VSBuffer } from '../../../../../vs/base/common/buffer.js';


import { IViewPaneOptions, ViewPane } from '../../../browser/parts/views/viewPane.js';

import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
// import { IDisposable } from '../../../../base/common/lifecycle.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { mountSidebar } from './react/src2/sidebar-tsx/index.js';

import { Codicon } from '../../../../base/common/codicons.js';
import { Orientation } from '../../../../base/browser/ui/sash/sash.js';
// import { IDisposable } from '../../../../base/common/lifecycle.js';
import { toDisposable } from '../../../../base/common/lifecycle.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ServicesAccessor } from '../../../../editor/browser/editorExtensions.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { IWorkbenchContribution, registerWorkbenchContribution2, WorkbenchPhase } from '../../../common/contributions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';

// compare against search.contribution.ts and debug.contribution.ts, scm.contribution.ts (source control)

// ---------- Define viewpane ----------

class SidebarViewPane extends ViewPane {

	constructor(
		options: IViewPaneOptions,
		@IInstantiationService instantiationService: IInstantiationService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IConfigurationService configurationService: IConfigurationService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IThemeService themeService: IThemeService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IKeybindingService keybindingService: IKeybindingService,
		@IOpenerService openerService: IOpenerService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IHoverService hoverService: IHoverService,
		@IChatThreadService private readonly _chatThreadService: IChatThreadService,
		@INotificationService private readonly _notificationService: INotificationService,
	) {
		super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService)

	}



	protected override renderBody(parent: HTMLElement): void {
		super.renderBody(parent);
		parent.style.userSelect = 'text'

		// Add paste event listener for images
		parent.addEventListener('paste', (e: ClipboardEvent) => {
			const items = e.clipboardData?.items;
			if (!items) return;

			for (const item of Array.from(items)) {
				if (item.type.startsWith('image/')) {
					const file = item.getAsFile();
					if (file) {
						// Handle pasted image
						this.handleImageFile(file);
					}
				}
			}
		});

		// Add drag & drop for image files
		parent.addEventListener('dragover', (e: DragEvent) => {
			e.preventDefault();
			e.stopPropagation();
		});

		parent.addEventListener('drop', (e: DragEvent) => {
			e.preventDefault();
			e.stopPropagation();

			const items = e.dataTransfer?.items;
			if (!items) return;

			for (const item of Array.from(items)) {
				if (item.kind === 'file' && item.type.startsWith('image/')) {
					const file = item.getAsFile();
					if (file) {
						// Handle dropped image
						this.handleImageFile(file);
					}
				}
			}
		});

		// Mount React
		this.instantiationService.invokeFunction(accessor => {
			const disposeFn: (() => void) | undefined = mountSidebar(parent, accessor)?.dispose;
			this._register(toDisposable(() => disposeFn?.()))
		});
	}

	private handleImageFile(file: File): void {
		// Validate MIME type
		if (!Object.values(VoidImageMimeType).includes(file.type as VoidImageMimeType)) {
			this._notificationService.warn(`Unsupported image format: ${file.type}. Supported formats are: PNG, JPEG, GIF, WEBP`);
			return;
		}

		const reader = new FileReader();
		reader.onload = () => {
			// Ensure proper type cast and validation
			if (!(reader.result instanceof ArrayBuffer)) {
				this._notificationService.error('Invalid file data');
				return;
			}

			const buffer = VSBuffer.wrap(new Uint8Array(reader.result));

			try {
				const thread = this._chatThreadService.getCurrentThread();
				if (!thread) {
					this._notificationService.error('No active chat thread');
					return;
				}

				const messages = [...thread.messages];  // Create copy to modify
				const messageIdx = messages.length - 1;
				const message = messages[messageIdx];

				if (!message || message.role !== 'user') {
					this._notificationService.warn('Please start typing a message before adding images');
					return;
				}

				// Create and add image to message
				const imagePart: IVoidImagePart = {
					type: 'image',
					mimeType: file.type as VoidImageMimeType,
					data: buffer
				};

				// Update the message with image
				const updatedMessage = {
					...messages[messageIdx],
					images: [...(message.images || []), imagePart]
				};
				messages[messageIdx] = updatedMessage;

				// Update thread
				try {
					// Update state immutably
					this._chatThreadService.dangerousSetState({
						...this._chatThreadService.state,
						allThreads: {
							...this._chatThreadService.state.allThreads,
							[thread.id]: {
								...thread,
								messages: messages.map((m, i) =>
									i === messageIdx ? {
										...(m as any), // Cast to any to avoid type errors
										images: [...((m as any).images || []), imagePart]
									} : m
								),
								lastModified: new Date().toISOString()
							}
						}
					});
} catch (error: any) {
					this._notificationService.error(`Failed to update message: ${error.message}`);
					throw error; // Re-throw to be caught by outer try-catch
				}

				this._notificationService.info('Image added to message');

			} catch (error) {
				this._notificationService.error(`Failed to add image: ${error.message}`);
			}
		};

		reader.onerror = () => {
			this._notificationService.error('Failed to read image file');
		};

		reader.readAsArrayBuffer(file);
	}

	protected override layoutBody(height: number, width: number): void {
		super.layoutBody(height, width)
		this.element.style.height = `${height}px`
		this.element.style.width = `${width}px`
	}

}



// ---------- Register viewpane inside the void container ----------

// const voidThemeIcon = Codicon.symbolObject;
// const voidViewIcon = registerIcon('void-view-icon', voidThemeIcon, localize('voidViewIcon', 'View icon of the Void chat view.'));

// called VIEWLET_ID in other places for some reason
export const VOID_VIEW_CONTAINER_ID = 'workbench.view.void'
export const VOID_VIEW_ID = VOID_VIEW_CONTAINER_ID

// Register view container
const viewContainerRegistry = Registry.as<IViewContainersRegistry>(ViewContainerExtensions.ViewContainersRegistry);
const container = viewContainerRegistry.registerViewContainer({
	id: VOID_VIEW_CONTAINER_ID,
	title: nls.localize2('voidContainer', 'Chat'), // this is used to say "Void" (Ctrl + L)
	ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [VOID_VIEW_CONTAINER_ID, {
		mergeViewWithContainerWhenSingleView: true,
		orientation: Orientation.HORIZONTAL,
	}]),
	hideIfEmpty: false,
	order: 1,

	rejectAddedViews: true,
	icon: Codicon.symbolMethod,


}, ViewContainerLocation.AuxiliaryBar, { doNotRegisterOpenCommand: true, isDefault: true });



// Register search default location to the container (sidebar)
const viewsRegistry = Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry);
viewsRegistry.registerViews([{
	id: VOID_VIEW_ID,
	hideByDefault: false, // start open
	// containerIcon: voidViewIcon,
	name: nls.localize2('voidChat', ''), // this says ... : CHAT
	ctorDescriptor: new SyncDescriptor(SidebarViewPane),
	canToggleVisibility: false,
	canMoveView: false, // can't move this out of its container
	weight: 80,
	order: 1,
	// singleViewPaneContainerTitle: 'hi',

	// openCommandActionDescriptor: {
	// 	id: VOID_VIEW_CONTAINER_ID,
	// 	keybindings: {
	// 		primary: KeyMod.CtrlCmd | KeyCode.KeyL,
	// 	},
	// 	order: 1
	// },
}], container);


// open sidebar
export const VOID_OPEN_SIDEBAR_ACTION_ID = 'void.openSidebar'
registerAction2(class extends Action2 {
	constructor() {
		super({
			id: VOID_OPEN_SIDEBAR_ACTION_ID,
			title: 'Open Void Sidebar',
		})
	}
	run(accessor: ServicesAccessor): void {
		const viewsService = accessor.get(IViewsService)
		viewsService.openViewContainer(VOID_VIEW_CONTAINER_ID);
	}
});

export class SidebarStartContribution implements IWorkbenchContribution {
	static readonly ID = 'workbench.contrib.startupVoidSidebar';
	constructor(
		@ICommandService private readonly commandService: ICommandService,
	) {
		this.commandService.executeCommand(VOID_OPEN_SIDEBAR_ACTION_ID)
	}
}
registerWorkbenchContribution2(SidebarStartContribution.ID, SidebarStartContribution, WorkbenchPhase.AfterRestored);
