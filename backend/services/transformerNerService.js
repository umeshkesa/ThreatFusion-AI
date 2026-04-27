const productDictionary = require("../utils/productDictionary");
const normalize = require("../utils/normalize");

const ENABLE_TRANSFORMER_NER = process.env.ENABLE_TRANSFORMER_NER === "true";
const PRODUCT_NER_MODEL = process.env.PRODUCT_NER_MODEL || "Xenova/bert-base-multilingual-cased-ner-hrl";
const GENERAL_NER_MODEL =
  process.env.GENERAL_NER_MODEL || "Xenova/bert-base-NER";

let transformersModulePromise;
let productPipelinePromise;
let generalPipelinePromise;
let availabilityLogged = false;

const dictionaryAliases = new Map();

for (const [product, aliases] of Object.entries(productDictionary)) {
  dictionaryAliases.set(normalize(product), product);

  for (const alias of aliases) {
    dictionaryAliases.set(normalize(alias), product);
  }
}

const loadTransformers = async () => {
  if (!ENABLE_TRANSFORMER_NER) return null;

  if (!transformersModulePromise) {
    transformersModulePromise = import("@xenova/transformers")
      .then((mod) => mod)
      .catch((error) => {
        if (!availabilityLogged) {
          console.warn("[ner] @xenova/transformers unavailable, using regex/dictionary extraction:", error.message);
          availabilityLogged = true;
        }

        return null;
      });
  }

  return transformersModulePromise;
};

const loadPipeline = async (modelName) => {
  const transformers = await loadTransformers();
  if (!transformers) return null;

  return transformers.pipeline("token-classification", modelName);
};

const getProductPipeline = () => {
  if (!productPipelinePromise) {
    productPipelinePromise = loadPipeline(PRODUCT_NER_MODEL).catch((error) => {
      console.warn(`[ner] Product NER model failed (${PRODUCT_NER_MODEL}), continuing without it:`, error.message);
      return null;
    });
  }

  return productPipelinePromise;
};

const getGeneralPipeline = () => {
  if (!generalPipelinePromise) {
    generalPipelinePromise = loadPipeline(GENERAL_NER_MODEL).catch((error) => {
      console.warn(`[ner] General NER model failed (${GENERAL_NER_MODEL}), continuing without it:`, error.message);
      return null;
    });
  }

  return generalPipelinePromise;
};

const cleanEntityText = (text) =>
  String(text || "")
    .replace(/^#+/, "")
    .replace(/\s+/g, " ")
    .trim();

const runPipeline = async (pipelinePromise, text) => {
  const ner = await pipelinePromise;
  if (!ner) return [];

  try {
    const result = await ner(text, {
      aggregation_strategy: "simple"
    });

    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.warn("[ner] NER inference failed, using fallback extraction:", error.message);
    return [];
  }
};

const mapEntityToProduct = (entityText) => {
  const entityNorm = normalize(entityText);
  if (!entityNorm) return null;

  if (dictionaryAliases.has(entityNorm)) {
    return dictionaryAliases.get(entityNorm);
  }

  for (const [aliasNorm, product] of dictionaryAliases.entries()) {
    if (entityNorm.includes(aliasNorm) || aliasNorm.includes(entityNorm)) {
      return product;
    }
  }

  return null;
};

const extractTransformerEntities = async (text) => {
  if (!text || !ENABLE_TRANSFORMER_NER) {
    return {
      products: [],
      entities: []
    };
  }

  const [productEntities, generalEntities] = await Promise.all([
    runPipeline(getProductPipeline(), text),
    runPipeline(getGeneralPipeline(), text)
  ]);

  const entities = [...productEntities, ...generalEntities]
    .map((entity) => ({
      text: cleanEntityText(entity.word || entity.entity || entity.text),
      type: entity.entity_group || entity.entity || "ENTITY",
      score: typeof entity.score === "number" ? entity.score : null
    }))
    .filter((entity) => entity.text);

  const products = Array.from(
    new Set(
      entities
        .map((entity) => mapEntityToProduct(entity.text))
        .filter(Boolean)
    )
  );

  return {
    products,
    entities
  };
};

module.exports = {
  extractTransformerEntities
};
