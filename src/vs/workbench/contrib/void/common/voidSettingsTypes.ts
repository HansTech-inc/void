/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { defaultModelsOfProvider, defaultProviderSettings } from './modelCapabilities.js';
import { ToolApprovalType } from './toolsServiceTypes.js';
import { VoidSettingsState } from './voidSettingsService.js'


export type ProviderName = keyof typeof defaultProviderSettings;

export const localProviderNames = ['ollama', 'vLLM', 'lmStudio'] as const
export const nonlocalProviderNames = ['anthropic', 'openAI', 'deepseek', 'openRouter', 'openAICompatible',
    'glama', 'gemini', 'groq', 'xAI', 'mistral', 'liteLLM', 'microsoftAzure'] as const

type CustomSettingName =
  | SettingNameEnum.ApiKey
  | SettingNameEnum.Endpoint
  | SettingNameEnum.AzureApiVersion
  | SettingNameEnum.Project
type CustomProviderSettings<providerName extends ProviderName> = {
	[k in CustomSettingName]: k extends keyof typeof defaultProviderSettings[providerName] ? string : undefined
}
export const customSettingNamesOfProvider = (providerName: ProviderName) => {
	return Object.keys(defaultProviderSettings[providerName]) as CustomSettingName[]
}



export type VoidStatefulModelInfo = { // <-- STATEFUL
	modelName: string,
	type: 'default' | 'autodetected' | 'custom';
	isHidden: boolean, // whether or not the user is hiding it (switched off)
}  // TODO!!! eventually we'd want to let the user change supportsFIM, etc on the model themselves



type CommonProviderSettings = {
	[SettingNameEnum.DidFillInProviderSettings]: boolean | undefined, // undefined initially, computed when user types in all fields
	[SettingNameEnum.Models]: VoidStatefulModelInfo[],
}

export type SettingsAtProvider<providerName extends ProviderName> = CustomProviderSettings<providerName> & CommonProviderSettings

// part of state
export type SettingsOfProvider = {
	[providerName in ProviderName]: SettingsAtProvider<providerName>
}


export type SettingName = SettingNameEnum

type DisplayInfoForProviderName = {
	title: string,
	desc?: string,
}

export const displayInfoOfProviderName = (providerName: ProviderName): DisplayInfoForProviderName => {
	if (providerName === 'anthropic') {
		return { title: 'Anthropic', }
	}
	else if (providerName === 'openAI') {
		return { title: 'OpenAI', }
	}
	else if (providerName === 'deepseek') {
		return { title: 'DeepSeek', }
	}
	else if (providerName === 'openRouter') {
		return { title: 'OpenRouter', }
	}
	else if (providerName === 'ollama') {
		return { title: 'Ollama', }
	}
	else if (providerName === 'vLLM') {
		return { title: 'vLLM', }
	}
	else if (providerName === 'liteLLM') {
		return { title: 'LiteLLM', }
	}
	else if (providerName === 'lmStudio') {
		return { title: 'LM Studio', }
	}
	else if (providerName === 'openAICompatible') {
		return { title: 'Custom', }
	}
	else if (providerName === 'gemini') {
		return { title: 'Gemini', }
	}
	else if (providerName === 'groq') {
		return { title: 'Groq', }
	}
	else if (providerName === 'xAI') {
		return { title: 'xAI', }
	}
	else if (providerName === 'mistral') {
		return { title: 'Mistral', }
	}
	else if (providerName === 'glama') {
		return { title: 'Glama AI', }
	}
	// else if (providerName === 'googleVertex') {
	// 	return { title: 'Google Vertex AI', }
	// }
	else if (providerName === 'microsoftAzure') {
		return { title: 'Microsoft Azure OpenAI', }
	}

	throw new Error(`descOfProviderName: Unknown provider name: "${providerName}"`)
}

export const subTextMdOfProviderName = (providerName: ProviderName): string => {

	if (providerName === 'anthropic') return 'Get your [API Key here](https://console.anthropic.com/settings/keys).'
	if (providerName === 'openAI') return 'Get your [API Key here](https://platform.openai.com/api-keys).'
	if (providerName === 'deepseek') return 'Get your [API Key here](https://platform.deepseek.com/api_keys).'
	if (providerName === 'openRouter') return 'Get your [API Key here](https://openrouter.ai/settings/keys).'
	if (providerName === 'gemini') return 'Get your [API Key here](https://aistudio.google.com/apikey).'
	if (providerName === 'groq') return 'Get your [API Key here](https://console.groq.com/keys).'
	if (providerName === 'xAI') return 'Get your [API Key here](https://console.x.ai).'
	if (providerName === 'mistral') return 'Get your [API Key here](https://console.mistral.ai/api-keys).'
	if (providerName === 'glama') return 'Free API from [Glama.ai](https://glama.ai/). Use the endpoint with your API key for access to free models.'
	if (providerName === 'openAICompatible') return `Use any provider that's OpenAI-compatible (most popular ones are).`
	// if (providerName === 'googleVertex') return 'You must authenticate before using Vertex with Void. Read more about endpoints [here](https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/call-vertex-using-openai-library), and regions [here](https://cloud.google.com/vertex-ai/docs/general/locations#available-regions).'
	if (providerName === 'microsoftAzure') return 'Read more about endpoints [here](https://learn.microsoft.com/en-us/rest/api/aifoundry/model-inference/get-chat-completions/get-chat-completions?view=rest-aifoundry-model-inference-2024-05-01-preview&tabs=HTTP), and get your API key [here](https://learn.microsoft.com/en-us/azure/search/search-security-api-keys?tabs=rest-use%2Cportal-find%2Cportal-query#find-existing-keys).'
	if (providerName === 'ollama') return 'If you would like to change this endpoint, please read more about [Endpoints here](https://github.com/ollama/ollama/blob/main/docs/faq.md#how-can-i-expose-ollama-on-my-network).'
	if (providerName === 'vLLM') return 'If you would like to change this endpoint, please read more about [Endpoints here](https://docs.vllm.ai/en/latest/getting_started/quickstart.html#openai-compatible-server).'
	if (providerName === 'lmStudio') return 'If you would like to change this endpoint, please more about [Endpoints here](https://lmstudio.ai/docs/app/api/endpoints/openai).'
	if (providerName === 'liteLLM') return 'Read more about endpoints [here](https://docs.litellm.ai/docs/providers/openai_compatible).'

	throw new Error(`subTextMdOfProviderName: Unknown provider name: "${providerName}"`)
}

type DisplayInfo = {
	title: string;
	placeholder: string;
	isPasswordField?: boolean;
}
export enum SettingNameEnum {
  ApiKey = 'apiKey',
  Endpoint = 'endpoint',
  AzureApiVersion = 'azureApiVersion',
  Project = 'project',
  DidFillInProviderSettings = '_didFillInProviderSettings',
  Models = 'models'
}

type ApiKeyPlaceholder = {
  [P in ProviderName]?: string;
};

const apiKeyPlaceholders: ApiKeyPlaceholder = {
  anthropic: 'sk-ant-key...',
  openAI: 'sk-proj-key...',
  deepseek: 'sk-key...',
  openRouter: 'sk-or-key...',
  gemini: 'AIzaSy...',
  groq: 'gsk_key...',
  openAICompatible: 'sk-key...',
  xAI: 'xai-key...',
  mistral: 'api-key...',
  microsoftAzure: 'key-...'
};

type EndpointInfo = {
  title: string;
  placeholder: string;
};

const endpointInfos: Partial<Record<ProviderName, EndpointInfo>> = {
  ollama: { title: 'Endpoint', placeholder: defaultProviderSettings.ollama.endpoint },
  vLLM: { title: 'Endpoint', placeholder: defaultProviderSettings.vLLM.endpoint },
  lmStudio: { title: 'Endpoint', placeholder: defaultProviderSettings.lmStudio.endpoint },
  openAICompatible: { title: 'baseURL', placeholder: 'https://my-website.com/v1' },
  microsoftAzure: { title: 'baseURL', placeholder: '' },
  liteLLM: { title: 'baseURL', placeholder: 'http://localhost:4000' }
};

export const displayInfoOfSettingName = (providerName: ProviderName, settingName: SettingNameEnum): DisplayInfo => {
  switch (settingName) {
    case SettingNameEnum.ApiKey:
      return {
        title: 'API Key',
        placeholder: apiKeyPlaceholders[providerName] || '',
        isPasswordField: true
      };

    case SettingNameEnum.Endpoint:
      const info = endpointInfos[providerName] || { title: '(never)', placeholder: '(never)' };
      return {
        title: info.title,
        placeholder: info.placeholder
      };

    case SettingNameEnum.AzureApiVersion:
      return {
        title: 'API Version',
        placeholder: providerName === 'microsoftAzure' ? defaultProviderSettings.microsoftAzure.azureApiVersion : ''
      };

    case SettingNameEnum.Project:
      return {
        title: providerName === 'microsoftAzure' ? 'Resource' : '',
        placeholder: providerName === 'microsoftAzure' ? 'my-resource' : ''
      };

    case SettingNameEnum.DidFillInProviderSettings:
    case SettingNameEnum.Models:
      return {
        title: '(never)',
        placeholder: '(never)'
      };

	     default:
	       throw new Error(`displayInfo: Unknown setting name: "${settingName}"`);
	 }
}




const defaultCustomSettings: Record<CustomSettingName, undefined> = {
	[SettingNameEnum.ApiKey]: undefined,
	[SettingNameEnum.Endpoint]: undefined,
	[SettingNameEnum.Project]: undefined,
	[SettingNameEnum.AzureApiVersion]: undefined,
}


const modelInfoOfDefaultModelNames = (defaultModelNames: string[]): { models: VoidStatefulModelInfo[] } => {
	return {
		models: defaultModelNames.map((modelName, i) => ({
			modelName,
			type: 'default',
			isHidden: defaultModelNames.length >= 10, // hide all models if there are a ton of them, and make user enable them individually
		}))
	}
}

// used when waiting and for a type reference
export const defaultSettingsOfProvider: SettingsOfProvider = {
	anthropic: {
		...defaultCustomSettings,
		...defaultProviderSettings.anthropic,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.anthropic),
		_didFillInProviderSettings: undefined,
	},
	glama: {
		...defaultCustomSettings,
		...defaultProviderSettings.glama,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.glama),
		_didFillInProviderSettings: undefined,
	},
	openAI: {
		...defaultCustomSettings,
		...defaultProviderSettings.openAI,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.openAI),
		_didFillInProviderSettings: undefined,
	},
	deepseek: {
		...defaultCustomSettings,
		...defaultProviderSettings.deepseek,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.deepseek),
		_didFillInProviderSettings: undefined,
	},
	gemini: {
		...defaultCustomSettings,
		...defaultProviderSettings.gemini,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.gemini),
		_didFillInProviderSettings: undefined,
	},
	xAI: {
		...defaultCustomSettings,
		...defaultProviderSettings.xAI,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.xAI),
		_didFillInProviderSettings: undefined,
	},
	mistral: {
		...defaultCustomSettings,
		...defaultProviderSettings.mistral,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.mistral),
		_didFillInProviderSettings: undefined,
	},
	liteLLM: {
		...defaultCustomSettings,
		...defaultProviderSettings.liteLLM,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.liteLLM),
		_didFillInProviderSettings: undefined,
	},
	lmStudio: {
		...defaultCustomSettings,
		...defaultProviderSettings.lmStudio,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.lmStudio),
		_didFillInProviderSettings: undefined,
	},
	groq: { // aggregator (serves models from multiple providers)
		...defaultCustomSettings,
		...defaultProviderSettings.groq,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.groq),
		_didFillInProviderSettings: undefined,
	},
	openRouter: { // aggregator (serves models from multiple providers)
		...defaultCustomSettings,
		...defaultProviderSettings.openRouter,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.openRouter),
		_didFillInProviderSettings: undefined,
	},
	openAICompatible: { // aggregator (serves models from multiple providers)
		...defaultCustomSettings,
		...defaultProviderSettings.openAICompatible,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.openAICompatible),
		_didFillInProviderSettings: undefined,
	},
	ollama: { // aggregator (serves models from multiple providers)
		...defaultCustomSettings,
		...defaultProviderSettings.ollama,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.ollama),
		_didFillInProviderSettings: undefined,
	},
	vLLM: { // aggregator (serves models from multiple providers)
		...defaultCustomSettings,
		...defaultProviderSettings.vLLM,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.vLLM),
		_didFillInProviderSettings: undefined,
	},
	// googleVertex: { // aggregator (serves models from multiple providers)
	// 	...defaultCustomSettings,
	// 	...defaultProviderSettings.googleVertex,
	// 	...modelInfoOfDefaultModelNames(defaultModelsOfProvider.googleVertex),
	// 	_didFillInProviderSettings: undefined,
	// },
	microsoftAzure: { // aggregator (serves models from multiple providers)
		...defaultCustomSettings,
		...defaultProviderSettings.microsoftAzure,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.microsoftAzure),
		_didFillInProviderSettings: undefined,
	},
}


export const providerNames = Object.keys(defaultProviderSettings) as ProviderName[]

export type ModelSelection = { providerName: ProviderName, modelName: string }

export const modelSelectionsEqual = (m1: ModelSelection, m2: ModelSelection) => {
	return m1.modelName === m2.modelName && m1.providerName === m2.providerName
}

// this is a state
export const featureNames = ['Chat', 'Ctrl+K', 'Autocomplete', 'Apply'] as const
export type ModelSelectionOfFeature = Record<(typeof featureNames)[number], ModelSelection | null>
export type FeatureName = keyof ModelSelectionOfFeature

export const displayInfoOfFeatureName = (featureName: FeatureName) => {
	// editor:
	if (featureName === 'Autocomplete')
		return 'Autocomplete'
	else if (featureName === 'Ctrl+K')
		return 'Quick Edit'
	// sidebar:
	else if (featureName === 'Chat')
		return 'Chat'
	else if (featureName === 'Apply')
		return 'Apply'
	else
		throw new Error(`Feature Name ${featureName} not allowed`)
}


// the models of these can be refreshed (in theory all can, but not all should)
export const refreshableProviderNames = localProviderNames
export type RefreshableProviderName = typeof refreshableProviderNames[number]

// models that come with download buttons
export const hasDownloadButtonsOnModelsProviderNames = ['ollama'] as const satisfies ProviderName[]





// use this in isFeatuerNameDissbled
const isRefreshableProviderName = (name: ProviderName): name is RefreshableProviderName => {
	return refreshableProviderNames.includes(name as RefreshableProviderName)
}

export const isProviderNameDisabled = (providerName: ProviderName, settingsState: VoidSettingsState) => {
	const settingsAtProvider = settingsState.settingsOfProvider[providerName]
	const isAutodetected = isRefreshableProviderName(providerName)

	const isDisabled = settingsAtProvider[SettingNameEnum.Models].length === 0
	if (isDisabled) {
		return isAutodetected
			? 'providerNotAutoDetected'
			: (!settingsAtProvider[SettingNameEnum.DidFillInProviderSettings] ? 'notFilledIn' : 'addModel')
	}
	return false
}

export const isFeatureNameDisabled = (featureName: FeatureName, settingsState: VoidSettingsState) => {
	// if has a selected provider, check if it's enabled
	const selectedProvider = settingsState.modelSelectionOfFeature[featureName]

	if (selectedProvider) {
		const { providerName } = selectedProvider
		return isProviderNameDisabled(providerName, settingsState)
	}

	// if there are any models they can turn on, tell them that
	const canTurnOnAModel = !!providerNames.find(providerName =>
		settingsState.settingsOfProvider[providerName][SettingNameEnum.Models].filter(m => m.isHidden).length !== 0
	)
	if (canTurnOnAModel) return 'needToEnableModel'

	// if there are any providers filled in, then they just need to add a model
	const anyFilledIn = !!providerNames.find(providerName =>
		settingsState.settingsOfProvider[providerName][SettingNameEnum.DidFillInProviderSettings]
	)
	if (anyFilledIn) return 'addModel'

	return 'addProvider'
}







export type ChatMode = 'agent' | 'gather' | 'normal'


export type GlobalSettings = {
	autoRefreshModels: boolean;
	aiInstructions: string;
	enableAutocomplete: boolean;
	syncApplyToChat: boolean;
	enableFastApply: boolean;
	chatMode: ChatMode;
	autoApprove: { [approvalType in ToolApprovalType]?: boolean };
	showInlineSuggestions: boolean;
	includeToolLintErrors: boolean;
	isOnboardingComplete: boolean;
}

export const defaultGlobalSettings: GlobalSettings = {
	autoRefreshModels: true,
	aiInstructions: '',
	enableAutocomplete: false,
	syncApplyToChat: true,
	enableFastApply: true,
	chatMode: 'agent',
	autoApprove: {},
	showInlineSuggestions: true,
	includeToolLintErrors: true,
	isOnboardingComplete: false,
}

export type GlobalSettingName = keyof GlobalSettings
export const globalSettingNames = Object.keys(defaultGlobalSettings) as GlobalSettingName[]












export type ModelSelectionOptions = {
	reasoningEnabled?: boolean;
	reasoningBudget?: number;
}

export type OptionsOfModelSelection = {
	[featureName in FeatureName]: Partial<{
		[providerName in ProviderName]: {
			[modelName: string]:
			ModelSelectionOptions | undefined
		}
	}>
}
