pub mod deepl;
pub mod deeplx;
pub mod generic;
pub mod llm;
pub mod types;

use pebble_core::Result;
use types::{TranslateProviderConfig, TranslateResult};

pub struct TranslateService;

impl TranslateService {
    pub async fn translate(
        config: &TranslateProviderConfig,
        text: &str,
        from: &str,
        to: &str,
    ) -> Result<TranslateResult> {
        match config {
            TranslateProviderConfig::DeepLX { endpoint } => {
                deeplx::translate(endpoint, text, from, to).await
            }
            TranslateProviderConfig::DeepL {
                api_key,
                use_free_api,
            } => deepl::translate(api_key, *use_free_api, text, from, to).await,
            TranslateProviderConfig::GenericApi {
                endpoint,
                api_key,
                source_lang_param,
                target_lang_param,
                text_param,
                result_path,
            } => {
                generic::translate(
                    endpoint,
                    api_key.as_deref(),
                    source_lang_param,
                    target_lang_param,
                    text_param,
                    result_path,
                    text,
                    from,
                    to,
                )
                .await
            }
            TranslateProviderConfig::LLM {
                endpoint,
                api_key,
                model,
                mode,
            } => llm::translate(endpoint, api_key, model, mode, text, from, to).await,
        }
    }
}
