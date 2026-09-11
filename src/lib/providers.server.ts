export type ProviderConfig = {
  name: string;
  label: string;
  apiKey: string;
  baseUrl: string;
  model: string;
};

export type PublicProvider = {
  id: string;
  label: string;
  model: string;
};

function env(name: string, fallback = ""): string {
  return process.env[name]?.trim() || fallback;
}

function stripSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

/**
 * OpenAI-compatible providers. A provider is enabled only when its API key is set.
 * Auto-fallback uses this order; a specific pick uses that provider only.
 */
export function buildProviderChain(): ProviderConfig[] {
  const openaiKey = env("OPENAI_API_KEY");
  const chatKey = env("CHAT_API_KEY");
  const customKey = env("CUSTOM_API_KEY");
  const chatBase = stripSlash(env("CHAT_API_BASE_URL", "https://api.openai.com/v1"));
  const customBase = stripSlash(env("CUSTOM_API_BASE_URL"));

  const candidates: ProviderConfig[] = [
    {
      name: "openai",
      label: "OpenAI",
      apiKey: openaiKey,
      baseUrl: stripSlash(env("OPENAI_BASE_URL", "https://api.openai.com/v1")),
      model: env("OPENAI_MODEL", "gpt-4o-mini"),
    },
    {
      name: "openrouter",
      label: "OpenRouter",
      apiKey: env("OPENROUTER_API_KEY"),
      baseUrl: stripSlash(env("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")),
      model: env("OPENROUTER_MODEL", "openai/gpt-4o-mini"),
    },
    {
      name: "groq",
      label: "Groq",
      apiKey: env("GROQ_API_KEY"),
      baseUrl: stripSlash(env("GROQ_BASE_URL", "https://api.groq.com/openai/v1")),
      model: env("GROQ_MODEL", "llama-3.3-70b-versatile"),
    },
    {
      name: "nim",
      label: "NVIDIA NIM",
      apiKey: env("NIM_API_KEY"),
      baseUrl: stripSlash(env("NIM_BASE_URL", "https://integrate.api.nvidia.com/v1")),
      model: env("NIM_MODEL", "meta/llama-3.1-70b-instruct"),
    },
    {
      name: "xai",
      label: "xAI Grok",
      apiKey: env("XAI_API_KEY"),
      baseUrl: stripSlash(env("XAI_BASE_URL", "https://api.x.ai/v1")),
      model: env("XAI_MODEL", "grok-4.5"),
    },
    {
      name: "together",
      label: "Together",
      apiKey: env("TOGETHER_API_KEY"),
      baseUrl: stripSlash(env("TOGETHER_BASE_URL", "https://api.together.xyz/v1")),
      model: env("TOGETHER_MODEL", "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo"),
    },
    {
      name: "fireworks",
      label: "Fireworks",
      apiKey: env("FIREWORKS_API_KEY"),
      baseUrl: stripSlash(env("FIREWORKS_BASE_URL", "https://api.fireworks.ai/inference/v1")),
      model: env("FIREWORKS_MODEL", "accounts/fireworks/models/llama-v3p1-70b-instruct"),
    },
    {
      name: "deepseek",
      label: "DeepSeek",
      apiKey: env("DEEPSEEK_API_KEY"),
      baseUrl: stripSlash(env("DEEPSEEK_BASE_URL", "https://api.deepseek.com")),
      model: env("DEEPSEEK_MODEL", "deepseek-chat"),
    },
    {
      name: "mistral",
      label: "Mistral",
      apiKey: env("MISTRAL_API_KEY"),
      baseUrl: stripSlash(env("MISTRAL_BASE_URL", "https://api.mistral.ai/v1")),
      model: env("MISTRAL_MODEL", "mistral-small-latest"),
    },
  ];

  const chatDuplicatesOpenai =
    Boolean(openaiKey) && chatBase === "https://api.openai.com/v1" && Boolean(chatKey);
  if (chatKey && !chatDuplicatesOpenai) {
    candidates.push({
      name: "chat",
      label: "Custom (CHAT_*)",
      apiKey: chatKey,
      baseUrl: chatBase,
      model: env("CHAT_MODEL", "gpt-4o-mini"),
    });
  }

  if (customKey && customBase) {
    candidates.push({
      name: "custom",
      label: "Custom",
      apiKey: customKey,
      baseUrl: customBase,
      model: env("CUSTOM_MODEL", "gpt-4o-mini"),
    });
  }

  return candidates.filter((c) => c.apiKey.length > 0);
}

export function hasAnyProviderConfigured(): boolean {
  return buildProviderChain().length > 0;
}

export function publicProviderList(): PublicProvider[] {
  return buildProviderChain().map((c) => ({
    id: c.name,
    label: c.label,
    model: c.model,
  }));
}

/** Auto = try every configured provider. A specific id uses that provider only. */
export function orderProviders(preferred?: string | null): ProviderConfig[] {
  const chain = buildProviderChain();
  const id = preferred?.trim().toLowerCase() ?? "";
  if (!id || id === "auto") return chain;
  const match = chain.find((c) => c.name === id);
  return match ? [match] : chain;
}
