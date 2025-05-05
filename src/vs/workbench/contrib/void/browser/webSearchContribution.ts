/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Extensions as WorkbenchExtensions, IWorkbenchContribution, IWorkbenchContributionsRegistry } from '../../../common/contributions.js';
import { LifecyclePhase } from '../../../../platform/lifecycle/common/lifecycle.js';
import { WebSearchParticipant } from './webSearchParticipant.js';

export class WebSearchContribution extends Disposable implements IWorkbenchContribution {
    static readonly ID = 'workbench.contrib.webSearch';

    constructor(
        @IInstantiationService instantiationService: IInstantiationService
    ) {
        super();

        // Register the participant
        this._register(instantiationService.createInstance(WebSearchParticipant));
    }
}

// Register contribution
Registry.as<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench)
    .registerWorkbenchContribution(
        WebSearchContribution,
        LifecyclePhase.Restored
    );
